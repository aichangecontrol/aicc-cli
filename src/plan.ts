import { loadSpec } from "./loadSpec.js";

export function buildPlan(filePath: string) {
  const spec = loadSpec(filePath) as any;

  return {
    version: spec.version,
    goal: spec.goal,
    plan: Array.isArray(spec.plan) ? spec.plan : [],
    outputs: spec.outputs ?? {},
  };
}
