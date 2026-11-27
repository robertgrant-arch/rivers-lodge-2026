// ESLint flat config — enforces the vertical-slice architecture (see CLAUDE.md).
//
// Elements (first match wins, so _core/_shared come before "features"):
//   _core    → _core/*            (server infra)   + features/_core  (client shell)
//   _shared  → _shared/*, features/_shared/*      (shared UI, utils, types)
//   features → features/<name>                     (one element per feature)
//
// Rules:
//   _core    may import _core and _shared, and features only via their public barrels —
//            except the composition roots below (app shell, root router, schema barrel).
//   _shared  may import _shared and _core.
//   features may import _core, _shared, anything inside their own folder, and other features
//            ONLY through public.ts / client/public.ts / server/public.ts.
//
// Imports are resolved with eslint-import-resolver-typescript (tsconfig "paths"), so the
// @core/@shared/@features aliases and relative paths are classified correctly.
// eslint.boundaries.test.ts proves a deep cross-feature import fails and a public one passes.
import boundaries from "eslint-plugin-boundaries";
import tsParser from "@typescript-eslint/parser";

const PUBLIC_ENTRIES = ["public.ts", "public.tsx", "client/public.ts", "server/public.ts"];

// Composition roots: the few _core files whose job is to wire every feature together.
// They may also reach a feature's route pages/layouts (lazy-loaded for code splitting),
// its schema.ts (Drizzle schema barrel) and its server router/session (root tRPC router).
const COMPOSITION_ROOTS = [
  "client/App.tsx",          // features/_core/client/App.tsx — lazy route pages
  "server/router.ts",        // _core/server/router.ts — mounts feature routers
  "server/context.ts",       // _core/server/context.ts — session lookup
  "db/schema.ts",            // _core/db/schema.ts — schema barrel
  "db/index.ts",             // _core/db/index.ts — drizzle-kit barrel
  "db/portal-schema.ts",     // _core/db/portal-schema.ts
];
const COMPOSITION_TARGETS = [
  "client/pages/**",
  "client/components/*Layout.tsx",
  "schema.ts",
  "server/router.ts",
  "server/adminRouter.ts",
  "server/session.ts",
];

export default [
  {
    ignores: ["**/node_modules/**", "dist/**", "_core/generated/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json", alwaysTryTypes: true },
      },
      "boundaries/elements": [
        { type: "_core", pattern: ["_core", "features/_core"], mode: "folder" },
        { type: "_shared", pattern: ["_shared", "features/_shared"], mode: "folder" },
        { type: "features", pattern: "features/*", mode: "folder", capture: ["featureName"] },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Vertical-slice violation: '{{dependency.source}}' is not allowed from {{from.type}} code. Cross-feature imports must go through the owning feature's public.ts (or client/public.ts, server/public.ts).",
          rules: [
            // Same element (e.g. features/admin → features/admin/...) is always fine.
            { allow: { dependency: { relationship: { to: "internal" } } } },
            // _core: _core, _shared, and feature public barrels (router/app shell mount features).
            { from: { type: "_core" }, allow: { to: { type: ["_core", "_shared"] } } },
            { from: { type: "_core" }, allow: { to: { type: "features", internalPath: PUBLIC_ENTRIES } } },
            {
              from: { type: "_core", internalPath: COMPOSITION_ROOTS },
              allow: { to: { type: "features", internalPath: COMPOSITION_TARGETS } },
            },
            // _shared: _shared and _core only.
            { from: { type: "_shared" }, allow: { to: { type: ["_shared", "_core"] } } },
            // features: _core, _shared, and other features' public barrels only.
            { from: { type: "features" }, allow: { to: { type: ["_core", "_shared"] } } },
            { from: { type: "features" }, allow: { to: { type: "features", internalPath: PUBLIC_ENTRIES } } },
          ],
        },
      ],
    },
  },
];
