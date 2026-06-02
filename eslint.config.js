import boundaries from "eslint-plugin-boundaries";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "_core",    pattern: "_core/*" },
        { type: "_shared",  pattern: ["_shared/*", "features/_shared/*"] },
        { type: "features", pattern: "features/*", capture: ["featureName"] },
      ],
    },
    rules: {
      // features/* can import from _core/*, _shared/*, and other features' public.ts ONLY
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            // _core can only import from _core
            {
              from: { type: "_core" },
              allow: { to: { type: "_core" } },
            },
            // _shared can import from _shared and _core
            {
              from: { type: "_shared" },
              allow: { to: { type: ["_shared", "_core"] } },
            },
            // features can import from _core, _shared
            {
              from: { type: "features" },
              allow: { to: { type: ["_core", "_shared"] } },
            },
            // features can import from other features ONLY via public.ts
            {
              from: { type: "features" },
              allow: { to: { type: "features", path: "*/public" } },
            },
          ],
        },
      ],
    },
  },
];
