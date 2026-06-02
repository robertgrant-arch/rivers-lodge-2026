import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from '@features/auth/server/oauth';
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { submitLimiter, authLimiter } from "./rateLimit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

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

  // Health check for Render (and other load balancers)
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
