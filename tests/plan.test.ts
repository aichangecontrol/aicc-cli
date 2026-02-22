import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { computePlan, formatPlanJson, getExitCode } from "../src/plan.js";

function runGit(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

function writeSpec(allowedPaths: string[]) {
  const spec = `version: 1\n\ngoal: "Test spec"\n\nscope:\n  allowed_paths:\n${allowedPaths
    .map((p) => `    - ${p}`)
    .join("\n")}\n\nacceptance_criteria:\n  - "Tests pass"\n\nplan:\n  - step: "Run tests"\n    verify: "npm test"\n\noutputs:\n  artifacts:\n    - pull_request\n    - audit_log\n`;
  const specDir = fs.mkdtempSync(path.join(os.tmpdir(), "aicc-spec-"));
  const specPath = path.join(specDir, "spec.yaml");
  fs.writeFileSync(specPath, spec, "utf-8");
  return specPath;
}

function initRepo(branch = "main") {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "aicc-plan-"));
  runGit(repoDir, ["init", "-b", branch]);
  runGit(repoDir, ["config", "user.email", "test@example.com"]);
  runGit(repoDir, ["config", "user.name", "Test User"]);
  return repoDir;
}

function commitAll(repoDir: string, message: string) {
  runGit(repoDir, ["add", "."]);
  runGit(repoDir, ["commit", "-m", message]);
}

describe("plan diff analysis", () => {
  it("returns PASS when changes are in scope", () => {
    const repo = initRepo();
    writeFile(path.join(repo, "src", "app.ts"), "console.log('base');\n");
    commitAll(repo, "base");

    const specPath = writeSpec(["src/"]);

    writeFile(path.join(repo, "src", "app.ts"), "console.log('change');\n");
    commitAll(repo, "change");

    const { plan } = computePlan(specPath, { cwd: repo, base: "HEAD~1" });
    expect(plan.result).toBe("PASS");
    expect(plan.out_of_scope.length).toBe(0);
    expect(getExitCode(plan)).toBe(0);
  });

  it("returns FAIL when changes are out of scope", () => {
    const repo = initRepo();
    writeFile(path.join(repo, "src", "app.ts"), "console.log('base');\n");
    commitAll(repo, "base");

    const specPath = writeSpec(["src/"]);

    writeFile(path.join(repo, "docs", "readme.md"), "out of scope\n");
    commitAll(repo, "change");

    const { plan } = computePlan(specPath, { cwd: repo, base: "HEAD~1" });
    expect(plan.result).toBe("FAIL");
    expect(plan.out_of_scope.length).toBe(1);
    expect(plan.out_of_scope[0].file).toContain("docs/readme.md");
    expect(getExitCode(plan)).toBe(1);
  });

  it("errors when not in a git repo", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "aicc-plan-nogit-"));
    const specPath = writeSpec(["src/"]);
    expect(() => computePlan(specPath, { cwd: repo })).toThrow(
      "Not a git repository."
    );
  });

  it("falls back to HEAD~1 when main refs are missing", () => {
    const repo = initRepo("feature");
    writeFile(path.join(repo, "src", "app.ts"), "console.log('base');\n");
    commitAll(repo, "base");

    const specPath = writeSpec(["src/"]);

    writeFile(path.join(repo, "src", "app.ts"), "console.log('change');\n");
    commitAll(repo, "change");

    const { plan, warnings } = computePlan(specPath, { cwd: repo });
    expect(plan.base).toBe("HEAD~1");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("outputs valid JSON", () => {
    const repo = initRepo();
    writeFile(path.join(repo, "src", "app.ts"), "console.log('base');\n");
    commitAll(repo, "base");

    const specPath = writeSpec(["src/"]);

    writeFile(path.join(repo, "src", "app.ts"), "console.log('change');\n");
    commitAll(repo, "change");

    const { plan } = computePlan(specPath, { cwd: repo, base: "HEAD~1" });
    const json = formatPlanJson(plan);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("spec_version");
    expect(parsed).toHaveProperty("goal");
    expect(parsed).toHaveProperty("base");
    expect(parsed).toHaveProperty("head");
    expect(parsed).toHaveProperty("allowed_paths");
    expect(parsed).toHaveProperty("changed_files");
    expect(parsed).toHaveProperty("in_scope");
    expect(parsed).toHaveProperty("out_of_scope");
    expect(parsed).toHaveProperty("signals");
    expect(parsed).toHaveProperty("result");
  });
});
