import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type AiccSpec = Record<string, unknown>;

export function loadSpec(filePath: string): AiccSpec {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, "utf-8");
  const data = yaml.load(raw);

  if (!data || typeof data !== "object") {
    throw new Error("Spec must be a YAML object.");
  }

  return data as AiccSpec;
}
