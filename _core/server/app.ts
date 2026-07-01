import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { submitLimiter, loginLimiter } from "./rateLimit";
import { resolvePort } from "./port";
import { checkDbHealth } from "./db";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Proxy trust ─────────────────────────────────────────────────────────────
  app.set("trust proxy", 1);

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }));

  // ── Body parsers ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const submitProcedures =
    /^\/api\/trpc\/(inquiries\.submit|membership\.submitApplication|messages\.send|waivers\.sign)/;
  app.use((req, res, next) => {
    if (submitProcedures.test(req.path)) {
      return submitLimiter(req, res, next);
    }
    next();
  });

  // Login endpoint — 10 attempts / 15 min / IP+email
  app.use((req, res, next) => {
    if (/^\/api\/trpc\/auth\.login/.test(req.path)) {
      return loginLimiter(req, res, next);
    }
    next();
  });

  registerStorageProxy(app);

  // XML sitemap
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
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(xml);
  });

  // Health check
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
