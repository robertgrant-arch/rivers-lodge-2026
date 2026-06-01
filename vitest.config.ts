import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@core": path.resolve(templateRoot, "_core"),
      "@shared": path.resolve(templateRoot, "features/_core/shared"),
      "@features": path.resolve(templateRoot, "features"),
      "@": path.resolve(templateRoot, "client", "src"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "features/**/*.test.ts", "features/**/*.spec.ts"],
  },
});
