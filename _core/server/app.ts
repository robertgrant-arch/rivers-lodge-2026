import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { submitLimiter, loginLimiter, acceptInviteLimiter, changePasswordLimiter } from "./rateLimit";
import { resolvePort } from "./port";
import { checkDbHealth } from "./db";
import { runMigrations } from "./migrate";

async function startServer() {
  // Run database migrations before starting the server
  // This ensures the schema is up-to-date before handling requests
  try {
    await runMigrations();
  } catch (error) {
    console.error("[App] Failed to run migrations — server will not start");
    throw error;
  }

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

  // Accept-invite — 20 / 15 min / IP
  app.use((req, res, next) => {
    if (/^\/api\/trpc\/auth\.acceptInvite/.test(req.path)) {
      return acceptInviteLimiter(req, res, next);
    }
    next();
  });

  // Change-password — 10 / 15 min / IP
  app.use((req, res, next) => {
    if (/^\/api\/trpc\/auth\.changePassword/.test(req.path)) {
      return changePasswordLimiter(req, res, next);
    }
    next();
  });

  registerStorageProxy(app);

  // XML sitemap
  app.get("/sitemap.xml", (_req, res) => {
    const base = "https://theriverslodge.com";
    const now = new Date().toISOString().split("T")[0];
    const urls = [
      { loc: "/",                                    priority: "1.0", changefreq: "weekly"  },
      { loc: "/weddings-events",                      priority: "0.9", changefreq: "monthly" },
      { loc: "/weddings",                            priority: "0.9", changefreq: "monthly" },
      { loc: "/outdoor-activities",                  priority: "0.9", changefreq: "monthly" },
      { loc: "/outdoor-activities/whitetail",        priority: "0.8", changefreq: "monthly" },
      { loc: "/outdoor-activities/waterfowl",        priority: "0.8", changefreq: "monthly" },
      { loc: "/outdoor-activities/upland-birds",     priority: "0.8", changefreq: "monthly" },
      { loc: "/outdoor-activities/turkey",           priority: "0.8", changefreq: "monthly" },
      { loc: "/outdoor-activities/fishing",          priority: "0.8", changefreq: "monthly" },
      { loc: "/lodging",                             priority: "0.8", changefreq: "monthly" },
      { loc: "/lodging/the-lodge",                   priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/riverhouse-suites",           priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-annex",                   priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-ohana",                   priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-farmhouse",               priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/big-tine-house",               priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/trego-road",                  priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-barn",                    priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-green-drake",             priority: "0.7", changefreq: "monthly" },
      { loc: "/lodging/the-clubhouse",               priority: "0.7", changefreq: "monthly" },
      { loc: "/corporate",                           priority: "0.7", changefreq: "monthly" },
      { loc: "/corporate-events",                    priority: "0.7", changefreq: "monthly" },
      { loc: "/membership",                          priority: "0.8", changefreq: "monthly" },
      { loc: "/membership/events",                   priority: "0.6", changefreq: "monthly" },
      { loc: "/contact",                             priority: "0.6", changefreq: "yearly"  },
      { loc: "/gallery",                             priority: "0.5", changefreq: "monthly" },
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

  // Health check — always 200 so Render never rolls back due to a transient DB
  // issue. DB status is reported in the body for observability only.
  app.get("/api/health", async (_req, res) => {
    const dbOk = await checkDbHealth().catch(() => false);
    res.json({ ok: true, db: dbOk ? "up" : "degraded" });
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
