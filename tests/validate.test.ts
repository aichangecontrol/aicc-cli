import { describe, expect, it } from "vitest";
import path from "node:path";
import { validateSpec } from "../src/validate.js";

const examplesDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../aicc-spec/examples"
);

describe("validateSpec", () => {
  it("validates minimal.yaml", () => {
    const result = validateSpec(path.join(examplesDir, "minimal.yaml"));
    expect(result.valid).toBe(true);
  });

  it("validates pr_safe_change.yaml", () => {
    const result = validateSpec(path.join(examplesDir, "pr_safe_change.yaml"));
    expect(result.valid).toBe(true);
  });

  it("validates migration_requires_approval.yaml", () => {
    const result = validateSpec(
      path.join(examplesDir, "migration_requires_approval.yaml")
    );
    expect(result.valid).toBe(true);
  });
});
