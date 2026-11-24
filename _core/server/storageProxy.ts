import type { Express } from "express";
import { ENV } from "./env";
import { isPublicStorageKey, readStoredFile, verifyStorageSignature } from "./storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Database backend (no Forge credentials): serve from stored_files.
    // Property files are public; anything else needs a valid signed link.
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      const isPublic = isPublicStorageKey(key);
      const q = req.query as Record<string, string | undefined>;
      if (!isPublic && !verifyStorageSignature(key, q.expires, q.sig)) {
        res.status(404).send("Not found");
        return;
      }
      try {
        const file = await readStoredFile(key);
        if (!file) {
          res.status(404).send("Not found");
          return;
        }
        res.set("Content-Type", file.contentType);
        res.set("X-Content-Type-Options", "nosniff");
        // Keys carry a random suffix and never change, so public files cache well.
        res.set("Cache-Control", isPublic ? "public, max-age=31536000, immutable" : "private, no-store");
        res.send(file.data);
      } catch (err) {
        console.error("[StorageProxy] database read failed:", err);
        res.status(502).send("Storage error");
      }
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
