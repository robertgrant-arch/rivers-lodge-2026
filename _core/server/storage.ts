// File storage.
//
// Two backends, chosen at runtime:
//   1. Forge (Manus storage service) — when BUILT_IN_FORGE_API_URL and
//      BUILT_IN_FORGE_API_KEY are set. Uploads go to S3 via a presigned PUT;
//      /manus-storage/{key} 307-redirects to a signed S3 URL.
//   2. Database — otherwise. Files are stored in the stored_files table
//      (migration 0039) and served by storageProxy.ts. Property files
//      ("properties/…", "generated/…") are served at /manus-storage/{key};
//      every other key (Member File photos, waiver documents) only through an
//      expiring HMAC-signed link from storageGetSignedUrl().
//
// Either way storagePut() returns { key, url: "/manus-storage/{key}" }, so
// callers and stored URLs don't change.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { ENV } from "./env";
import { getDb } from "./db";
import { storedFiles } from "@core/db/storage-schema";

/** Forge storage credentials present. */
export function isForgeStorageConfigured(): boolean {
  return !!ENV.forgeApiUrl && !!ENV.forgeApiKey;
}

/** Key prefixes served publicly at /manus-storage/{key} by the database backend. */
export const PUBLIC_STORAGE_PREFIXES = ["properties/", "generated/"] as const;
export const isPublicStorageKey = (key: string) => PUBLIC_STORAGE_PREFIXES.some((p) => key.startsWith(p));

/** How long a signed private-file link stays valid. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function signingSecret(): string | null {
  if (process.env.FILE_URL_SECRET) return process.env.FILE_URL_SECRET;
  const dbUrl = process.env.DATABASE_URL ?? ENV.databaseUrl;
  // DATABASE_URL is itself a server secret; derive a separate key from it.
  return dbUrl ? createHash("sha256").update(`rivers-lodge:file-url:${dbUrl}`).digest("hex") : null;
}

function signature(key: string, expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`${key}:${expires}`).digest("hex");
}

/** Check a signed private-file link (database backend). */
export function verifyStorageSignature(key: string, expires: string | undefined, sig: string | undefined, nowMs = Date.now()): boolean {
  const secret = signingSecret();
  const exp = Number(expires);
  if (!secret || !sig || !Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  const want = Buffer.from(signature(key, exp, secret), "hex");
  const got = Buffer.from(String(sig), "hex");
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Signed link for a private file stored in the database. */
export function signedDatabaseUrl(key: string, nowMs = Date.now()): string {
  const secret = signingSecret();
  if (!secret) throw new Error("Can't sign file links: DATABASE_URL (or FILE_URL_SECRET) is not set");
  const expires = Math.floor(nowMs / 1000) + SIGNED_URL_TTL_SECONDS;
  return `/manus-storage/${key}?expires=${expires}&sig=${signature(key, expires, secret)}`;
}

/** Read a file stored by the database backend (null if missing). */
export async function readStoredFile(key: string): Promise<{ contentType: string; data: Buffer } | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ contentType: storedFiles.contentType, data: storedFiles.data }).from(storedFiles).where(eq(storedFiles.key, key)).limit(1);
  return row ?? null;
}

/** True when uploads can be stored: Forge credentials, or a database for the fallback. */
export function isStorageConfigured(): boolean {
  return isForgeStorageConfigured() || !!(process.env.DATABASE_URL ?? ENV.databaseUrl);
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  if (!isForgeStorageConfigured()) return databasePut(relKey, data, contentType);
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

async function databasePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const db = await getDb();
  if (!db) throw new Error("File storage unavailable: no Forge credentials and no database connection");
  const key = appendHashSuffix(normalizeKey(relKey));
  const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await db.insert(storedFiles).values({ key, contentType, size: buffer.length, data: buffer });
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (!isForgeStorageConfigured()) return signedDatabaseUrl(key);
  const { forgeUrl, forgeKey } = getForgeConfig();

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
