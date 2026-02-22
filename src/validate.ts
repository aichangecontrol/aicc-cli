import fs from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import { loadSpec } from "./loadSpec.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function loadSchema() {
  const moduleDir = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(moduleDir, "../../aicc-spec/schema.json"),
    path.resolve(moduleDir, "../../../aicc-spec/schema.json"),
  ];

  for (const schemaPath of candidates) {
    if (fs.existsSync(schemaPath)) {
      const raw = fs.readFileSync(schemaPath, "utf-8");
      return JSON.parse(raw);
    }
  }

  throw new Error(`Unable to locate schema.json. Tried: ${candidates.join(", ")}`);
}

export function validateSpec(filePath: string): ValidationResult {
  const spec = loadSpec(filePath);
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const schema = loadSchema();
  const validate = ajv.compile(schema);
  const schemaValid = validate(spec);
  const errors: string[] = [];

  if (!schemaValid && validate.errors) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath || "(root)"} ${err.message ?? ""}`.trim());
    }
  }

  const scope = (spec as any).scope;
  const allowedPaths = scope?.allowed_paths;
  if (!Array.isArray(allowedPaths) || allowedPaths.length === 0) {
    errors.push("scope.allowed_paths must be a non-empty array.");
  }

  const acceptanceCriteria = (spec as any).acceptance_criteria;
  if (!Array.isArray(acceptanceCriteria) || acceptanceCriteria.length === 0) {
    errors.push("acceptance_criteria must have at least one entry.");
  }

  const plan = (spec as any).plan;
  const hasVerify = Array.isArray(plan)
    ? plan.some((step: any) => typeof step?.verify === "string" && step.verify.length > 0)
    : false;
  if (!hasVerify) {
    errors.push("plan must include at least one step with verify.");
  }

  return { valid: errors.length === 0, errors };
}
