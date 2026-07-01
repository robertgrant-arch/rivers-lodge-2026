export const authConfig = Object.freeze({
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === "true",
  isProduction: process.env.NODE_ENV === "production",
});
