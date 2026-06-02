import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@core": path.resolve(templateRoot, "_core"),
      // @shared/errors lives in _core/shared, not _shared/ — explicit alias wins.
      "@shared/errors": path.resolve(templateRoot, "features/_core/shared/errors"),
      "@shared": path.resolve(templateRoot, "features/_shared"),
      "@features": path.resolve(templateRoot, "features"),
      "@": path.resolve(templateRoot, "client", "src"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "_core/**/*.test.ts",
      "_core/**/*.spec.ts",
      "_shared/**/*.test.ts",
      "_shared/**/*.spec.ts",
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "features/**/*.test.ts",
      "features/**/*.test.tsx",
      "features/**/*.spec.ts",
      "features/**/*.spec.tsx",
    ],
  },
});
