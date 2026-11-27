/**
 * Proves eslint.config.js actually enforces the vertical-slice rules: imports are
 * resolved (aliases + relative paths) and classified, so a deep cross-feature import
 * fails while the owning feature's public barrel passes.
 *
 * Fixtures are linted in memory with a virtual file path inside the repo, so no
 * files are written.
 */
import { describe, it, expect } from "vitest";
import { ESLint } from "eslint";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const eslint = new ESLint({ cwd: root });

async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  const fatal = result.messages.filter((m) => m.fatal);
  if (fatal.length) throw new Error(`Parse error: ${fatal.map((m) => m.message).join("; ")}`);
  return result.messages.filter((m) => m.ruleId === "boundaries/dependencies").map((m) => m.message);
}

const FROM_FEATURE = "features/marketing/client/pages/__BoundaryFixture.tsx";

describe("vertical-slice lint (eslint-plugin-boundaries)", () => {
  it("FAILS a deep alias import into another feature", async () => {
    const errors = await boundaryErrors(FROM_FEATURE, `import PortalMembership from "@features/admin/client/pages/PortalMembership";\nexport default PortalMembership;\n`);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("@features/admin/client/pages/PortalMembership");
  });

  it("FAILS a deep relative import into another feature", async () => {
    const errors = await boundaryErrors(FROM_FEATURE, `import PortalMembership from "../../../admin/client/pages/PortalMembership";\nexport default PortalMembership;\n`);
    expect(errors).toHaveLength(1);
  });

  it("FAILS a deep import of another feature's schema", async () => {
    expect(await boundaryErrors("features/admin/server/__fixture.ts", `export { sessions } from "@features/auth/schema";\n`)).toHaveLength(1);
  });

  it("PASSES the owning feature's public barrels", async () => {
    expect(await boundaryErrors(FROM_FEATURE, `export { adminRouter } from "@features/admin/public";\n`)).toEqual([]);
    expect(await boundaryErrors(FROM_FEATURE, `export { FAQAccordion } from "@features/cms/client/public";\n`)).toEqual([]);
    expect(await boundaryErrors("features/admin/server/__fixture.ts", `export { sessions } from "@features/auth/server/public";\n`)).toEqual([]);
  });

  it("PASSES deep imports inside the same feature and into _core/_shared", async () => {
    const code = `import { usePortalLink } from "@features/portal/client/portalNav";\nimport { trpc } from "@shared/lib/trpc";\nimport { getDb } from "@core/server/db";\nexport { usePortalLink, trpc, getDb };\n`;
    expect(await boundaryErrors("features/portal/client/pages/__fixture.tsx", code)).toEqual([]);
  });

  it("classifies features/_shared as _shared: it may not import any feature, even its public barrel", async () => {
    expect(await boundaryErrors("features/_shared/components/__fixture.tsx", `export { useAuth } from "@features/auth/public";\n`)).toHaveLength(1);
    expect(await boundaryErrors("features/_shared/components/__fixture.tsx", `export { Button } from "@shared/ui/button";\n`)).toEqual([]);
  });

  it("classifies features/_core as _core: only composition roots may reach feature pages", async () => {
    const code = `export const P = () => import("@features/admin/client/pages/PortalMembership");\n`;
    expect(await boundaryErrors("features/_core/client/App.tsx", code)).toEqual([]);
    expect(await boundaryErrors("features/_core/client/__notARoot.tsx", code)).toHaveLength(1);
  });
});
