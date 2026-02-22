import { loadSpec } from "./loadSpec.js";
import { validateSpec } from "./validate.js";
import { getChangedFiles } from "./git.js";
import { isInScope, normalizePath } from "./scope.js";

export type PlanSignals = {
  db_migration: boolean;
  infra: boolean;
  dependencies: boolean;
  ui: boolean;
};

export type OutOfScopeItem = {
  file: string;
  reason: string;
};

export type PlanData = {
  spec_version: number;
  goal: string;
  base: string;
  head: string;
  allowed_paths: string[];
  changed_files: string[];
  in_scope: string[];
  out_of_scope: OutOfScopeItem[];
  signals: PlanSignals;
  result: "PASS" | "FAIL";
};

export type PlanOptions = {
  base?: string;
  head?: string;
  cwd?: string;
};

const SIGNAL_PATHS = {
  db_migration: ["/migrations/", "/alembic/", "prisma/migrations/", "db/migrate/"],
  infra: [
    "infra/",
    "terraform/",
    ".tf",
    "helm/",
    "k8s/",
    "charts/",
    "docker-compose.yml",
  ],
  dependencies: [
    "package.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json",
    "requirements.txt",
    "poetry.lock",
    "Pipfile.lock",
    "go.mod",
    "go.sum",
  ],
  ui: ["frontend/", "ui/", "web/", "apps/web/"],
};

function normalizePattern(value: string): string {
  let normalized = normalizePath(value);
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

function detectSignals(files: string[]): PlanSignals {
  const normalized = files.map(normalizePath);
  const matchAny = (patterns: string[]) =>
    normalized.some((file) =>
      patterns.some((pattern) => {
        const normalizedPattern = normalizePattern(pattern);
        return normalizedPattern.startsWith(".")
          ? file.endsWith(normalizedPattern)
          : file.includes(normalizedPattern);
      })
    );

  return {
    db_migration: matchAny(SIGNAL_PATHS.db_migration),
    infra: matchAny(SIGNAL_PATHS.infra),
    dependencies: matchAny(SIGNAL_PATHS.dependencies),
    ui: matchAny(SIGNAL_PATHS.ui),
  };
}

export function computePlan(filePath: string, options: PlanOptions = {}) {
  const validation = validateSpec(filePath);
  if (!validation.valid) {
    throw new Error(`Invalid spec: ${validation.errors.join("; ")}`);
  }

  const spec = loadSpec(filePath) as any;
  const allowedPaths = Array.isArray(spec?.scope?.allowed_paths)
    ? spec.scope.allowed_paths.map((path: string) => normalizePath(String(path)))
    : [];

  const { base, head, files, warnings } = getChangedFiles({
    cwd: options.cwd ?? process.cwd(),
    base: options.base,
    head: options.head,
  });

  const inScope: string[] = [];
  const outOfScope: OutOfScopeItem[] = [];

  for (const file of files) {
    if (isInScope(file, allowedPaths)) {
      inScope.push(file);
    } else {
      outOfScope.push({ file, reason: "Not within scope.allowed_paths" });
    }
  }

  const signals = detectSignals(files);
  const result = outOfScope.length > 0 ? "FAIL" : "PASS";

  const plan: PlanData = {
    spec_version: Number(spec.version ?? 0),
    goal: String(spec.goal ?? ""),
    base,
    head,
    allowed_paths: allowedPaths,
    changed_files: files,
    in_scope: inScope,
    out_of_scope: outOfScope,
    signals,
    result,
  };

  return { plan, warnings };
}

export function formatPlanHuman(plan: PlanData): string {
  const lines: string[] = [];

  lines.push("AICC Plan Summary");
  lines.push("");
  lines.push(`Spec version: ${plan.spec_version}`);
  if (plan.goal) {
    lines.push(`Goal: ${plan.goal}`);
  }
  lines.push(`Base: ${plan.base}`);
  lines.push(`Head: ${plan.head}`);
  lines.push("");
  lines.push("Allowed scope:");
  for (const scope of plan.allowed_paths) {
    lines.push(`- ${scope}`);
  }
  lines.push("");
  lines.push("Changed files:");

  if (plan.in_scope.length === 0 && plan.out_of_scope.length === 0) {
    lines.push("- (no changes)");
  }

  for (const file of plan.in_scope) {
    lines.push(`- ✓ ${file}`);
  }
  for (const item of plan.out_of_scope) {
    lines.push(`- ✗ ${item.file} (${item.reason})`);
  }

  lines.push("");
  lines.push("Signals:");
  lines.push(`- db_migration: ${plan.signals.db_migration ? "yes" : "no"}`);
  lines.push(`- infra: ${plan.signals.infra ? "yes" : "no"}`);
  lines.push(`- dependencies: ${plan.signals.dependencies ? "yes" : "no"}`);
  lines.push(`- ui: ${plan.signals.ui ? "yes" : "no"}`);
  lines.push("");
  lines.push("Result:");
  lines.push(`- ${plan.result}`);

  return lines.join("\n");
}

export function formatPlanJson(plan: PlanData): string {
  return JSON.stringify(plan, null, 2);
}

export function getExitCode(plan: PlanData): number {
  return plan.result === "PASS" ? 0 : 1;
}
