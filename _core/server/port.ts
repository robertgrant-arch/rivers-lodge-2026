/**
 * Port resolution — separated from app.ts so tests can import without
 * triggering startServer().
 */

import net from "net";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(port, () => srv.close(() => resolve(true)));
    srv.on("error", () => resolve(false));
  });
}

export async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found in range [${startPort}, ${startPort + 19}]`);
}

/**
 * Resolve the port the server should bind to.
 *
 * Production: reads PORT directly — Render injects it and it must match the
 * port Render's health-check pings.  If PORT is absent or not a number, we
 * throw at boot rather than silently binding to a wrong port and passing
 * health checks on the wrong address.
 *
 * Development / test: falls back to findAvailablePort so local dev keeps
 * working even when the preferred port is already occupied.
 */
export async function resolvePort(): Promise<number> {
  const raw = process.env.PORT;

  if (process.env.NODE_ENV === "production") {
    const port = raw ? parseInt(raw, 10) : NaN;
    if (!raw || isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        "[boot] PORT environment variable is required in production and must be a valid port number.",
      );
    }
    return port;
  }

  // Development / test — scan for an available port.
  const preferred = raw ? parseInt(raw, 10) : 3000;
  return findAvailablePort(isNaN(preferred) ? 3000 : preferred);
}
