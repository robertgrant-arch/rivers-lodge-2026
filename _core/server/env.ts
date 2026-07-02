export const ENV = {
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === "true",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminTempPassword: process.env.ADMIN_TEMP_PASSWORD ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5173",
  // Email (invite / password-reset delivery). See _core/server/mailer.ts.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "",
};
