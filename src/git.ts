import { execFileSync } from "node:child_process";

export type GitDiffOptions = {
  cwd: string;
  base?: string;
  head?: string;
};

export type GitDiffResult = {
  base: string;
  head: string;
  files: string[];
  warnings: string[];
};

function runGit(args: string[], cwd: string) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function ensureGitRepo(cwd: string) {
  try {
    const inside = runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    if (inside !== "true") {
      throw new Error("Not a git repository.");
    }
  } catch (error) {
    throw new Error("Not a git repository.");
  }
}

export function resolveRef(cwd: string, ref: string): boolean {
  try {
    runGit(["rev-parse", "--verify", ref], cwd);
    return true;
  } catch {
    return false;
  }
}

function getDefaultBase(cwd: string, warnings: string[]): string {
  if (resolveRef(cwd, "origin/main")) {
    return "origin/main";
  }
  if (resolveRef(cwd, "main")) {
    return "main";
  }
  if (resolveRef(cwd, "HEAD~1")) {
    warnings.push("Default base not found (origin/main or main). Using HEAD~1.");
    return "HEAD~1";
  }
  throw new Error("Unable to determine base ref. Provide --base.");
}

export function getChangedFiles({ cwd, base, head }: GitDiffOptions): GitDiffResult {
  ensureGitRepo(cwd);
  const warnings: string[] = [];
  const resolvedHead = head ?? "HEAD";

  if (!resolveRef(cwd, resolvedHead)) {
    throw new Error(`Invalid head ref: ${resolvedHead}`);
  }

  let resolvedBase = base;
  if (!resolvedBase) {
    resolvedBase = getDefaultBase(cwd, warnings);
  } else if (!resolveRef(cwd, resolvedBase)) {
    throw new Error(`Invalid base ref: ${resolvedBase}`);
  }

  const output = runGit([
    "diff",
    "--name-only",
    `${resolvedBase}...${resolvedHead}`,
  ], cwd);

  const files = output
    ? output.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  return {
    base: resolvedBase,
    head: resolvedHead,
    files,
    warnings,
  };
}
