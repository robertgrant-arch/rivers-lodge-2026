/** Read and validate JWT_SECRET (used as the session cookie signing secret). */
function loadCookieSecret(): string {
  const secret = process.env.JWT_SECRET ?? "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[boot] JWT_SECRET is required in production. " +
          "Set the JWT_SECRET environment variable before starting the server.",
      );
    }
    // Warn once at startup in development — sessions won't survive restarts.
    console.warn(
      "[dev] JWT_SECRET is not set. Using an empty string as the cookie " +
        "secret — sessions are insecure and will not persist across restarts.",
    );
  }
  return secret;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: loadCookieSecret(),
  /**
   * When true, session cookies are issued with SameSite=None; Secure=true so
   * that cross-origin requests (e.g. API on api.example.com, frontend on
   * example.com) work in modern browsers.  Must only be enabled on HTTPS
   * deployments — browsers silently drop SameSite=None cookies served over
   * plain HTTP.  Defaults to false (SameSite=Lax).
   */
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === "true",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
