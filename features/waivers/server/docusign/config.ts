/**
 * DocuSign configuration (eSignature REST API v2.1, JWT Grant).
 *
 * Env vars (Render dashboard):
 *   WAIVERS_DOCUSIGN_ENABLED      "true" to turn the feature on (default OFF —
 *                                 nothing is sent and no booking is blocked)
 *   DOCUSIGN_INTEGRATION_KEY      app's Integration Key (client id)
 *   DOCUSIGN_USER_ID              API user GUID to impersonate
 *   DOCUSIGN_ACCOUNT_ID           API Account ID (GUID)
 *   DOCUSIGN_BASE_PATH            e.g. https://demo.docusign.net/restapi
 *   DOCUSIGN_OAUTH_BASE           e.g. account-d.docusign.com (demo) / account.docusign.com
 *   DOCUSIGN_PRIVATE_KEY          RSA private key (PEM; "\n" escapes are accepted)
 *   DOCUSIGN_CONNECT_HMAC_SECRET  Connect HMAC key; when unset we poll instead
 *
 * Never log these values.
 */

export interface DocuSignConfig {
  integrationKey: string;
  userId: string;
  accountId: string;
  basePath: string;
  oauthHost: string;
  privateKey: string;
}

export function isWaiversDocuSignEnabled(): boolean {
  return String(process.env.WAIVERS_DOCUSIGN_ENABLED ?? "").trim().toLowerCase() === "true";
}

/** Connect webhooks are usable only with an HMAC secret; otherwise poll. */
export function connectHmacSecret(): string | null {
  const s = process.env.DOCUSIGN_CONNECT_HMAC_SECRET;
  return s && s.trim() ? s.trim() : null;
}

export function getDocuSignConfig(): DocuSignConfig | null {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim();
  const userId = process.env.DOCUSIGN_USER_ID?.trim();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim();
  const basePath = process.env.DOCUSIGN_BASE_PATH?.trim();
  const oauthBase = process.env.DOCUSIGN_OAUTH_BASE?.trim();
  const rawKey = process.env.DOCUSIGN_PRIVATE_KEY;
  if (!integrationKey || !userId || !accountId || !basePath || !oauthBase || !rawKey) return null;
  return {
    integrationKey,
    userId,
    accountId,
    basePath: basePath.replace(/\/+$/, ""),
    oauthHost: oauthBase.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    privateKey: rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey,
  };
}

/** Which required env vars are missing (names only — safe to show staff). */
export function missingDocuSignEnv(): string[] {
  return [
    "DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_USER_ID", "DOCUSIGN_ACCOUNT_ID",
    "DOCUSIGN_BASE_PATH", "DOCUSIGN_OAUTH_BASE", "DOCUSIGN_PRIVATE_KEY",
  ].filter((k) => !process.env[k]?.trim());
}
