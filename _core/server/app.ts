import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from '@features/auth/public';
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { submitLimiter, authLimiter } from "./rateLimit";
import { resolvePort } from "./port";
import { checkDbHealth } from "./db";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security headers ────────────────────────────────────────────────────────
  // CSP is intentionally disabled here — a real policy is added in a later
  // prompt once nonces are wired through the SSR/Vite HTML transform.
  app.use(helmet({ contentSecurityPolicy: false }));

  // ── Body parsers ────────────────────────────────────────────────────────────
  // 1 MB covers all tRPC JSON payloads with room to spare.
  // If a specific route ever needs more (e.g. a future image-upload endpoint),
  // mount a separate express.json({ limit: "10mb" }) on that route alone.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  // Auth endpoints (OAuth start + callback) — 10 req/min/IP.
  app.use("/api/oauth", authLimiter);

  // Public form-submission tRPC procedures — 5 req/min/IP.
  // We match on path prefix before createExpressMiddleware so the limiter
  // fires before tRPC decoding.  tRPC routes are:
  //   POST /api/trpc/inquiries.submit
  //   POST /api/trpc/membership.submitApplication
  //   POST /api/trpc/messages.send
  //   POST /api/trpc/waivers.sign
  // The regex covers all of them with a single middleware mount.
  const submitProcedures =
    /^\/api\/trpc\/(inquiries\.submit|membership\.submitApplication|messages\.send|waivers\.sign)/;
  app.use((req, res, next) => {
    if (submitProcedures.test(req.path)) {
      return submitLimiter(req, res, next);
    }
    next();
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // XML sitemap — minimal static set of public marketing pages.
  // A richer dynamic sitemap (property listings, blog posts, etc.) is a
  // later prompt; this ensures search engines can discover the core pages.
  app.get("/sitemap.xml", (_req, res) => {
    const base = "https://theriverslodge.com";
    const now = new Date().toISOString().split("T")[0];
    const urls = [
      { loc: "/",           priority: "1.0", changefreq: "weekly" },
      { loc: "/weddings",   priority: "0.9", changefreq: "monthly" },
      { loc: "/hunt",       priority: "0.9", changefreq: "monthly" },
      { loc: "/fish",       priority: "0.8", changefreq: "monthly" },
      { loc: "/lodging",    priority: "0.8", changefreq: "monthly" },
      { loc: "/corporate",  priority: "0.7", changefreq: "monthly" },
      { loc: "/membership", priority: "0.8", changefreq: "monthly" },
      { loc: "/contact",    priority: "0.6", changefreq: "yearly"  },
      { loc: "/gallery",    priority: "0.5", changefreq: "monthly" },
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(({ loc, priority, changefreq }) =>
        [
          "  <url>",
          `    <loc>${base}${loc}</loc>`,
          `    <lastmod>${now}</lastmod>`,
          `    <changefreq>${changefreq}</changefreq>`,
          `    <priority>${priority}</priority>`,
          "  </url>",
        ].join("\n"),
      ),
      "</urlset>",
    ].join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 h
    res.send(xml);
  });

  // Health check for Render (and other load balancers).
  // Verifies DB connectivity with SELECT 1 / 2-second timeout so that a
  // crashed pool removes the instance from rotation instead of silently
  // serving errors.
  app.get("/api/health", async (_req, res) => {
    try {
      const dbOk = await checkDbHealth();
      if (!dbOk) {
        res.status(503).json({ ok: false, db: "down" });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false, db: "down" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = await resolvePort();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
