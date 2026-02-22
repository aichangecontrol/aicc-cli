#!/usr/bin/env node
import { Command } from "commander";
import { validateSpec } from "./validate.js";
import {
  computePlan,
  formatPlanHuman,
  formatPlanJson,
  getExitCode,
} from "./plan.js";

const program = new Command();

program
  .name("aicc")
  .description("AICC CLI")
  .version("0.1.0");

program
  .command("validate")
  .argument("<path>", "Path to AICC spec YAML")
  .description("Validate an AICC spec")
  .action((filePath: string) => {
    try {
      const result = validateSpec(filePath);
      if (!result.valid) {
        console.error("Validation failed:");
        for (const err of result.errors) {
          console.error(`- ${err}`);
        }
        process.exit(1);
      }
      console.log("Spec is valid.");
    } catch (error) {
      console.error("Internal error:", error instanceof Error ? error.message : error);
      process.exit(2);
    }
  });

program
  .command("plan")
  .argument("<path>", "Path to AICC spec YAML")
  .option("--json", "Output plan as JSON")
  .option("--base <ref>", "Base git ref")
  .option("--head <ref>", "Head git ref", "HEAD")
  .description("Analyze git diff against AICC scope and summarize changes")
  .action((filePath: string, options: { json?: boolean; base?: string; head?: string }) => {
    try {
      const { plan, warnings } = computePlan(filePath, {
        base: options.base,
        head: options.head,
        cwd: process.cwd(),
      });

      if (warnings.length > 0) {
        for (const warning of warnings) {
          console.error(`Warning: ${warning}`);
        }
      }

      const output = options.json ? formatPlanJson(plan) : formatPlanHuman(plan);
      console.log(output);
      process.exit(getExitCode(plan));
    } catch (error) {
      console.error("Internal error:", error instanceof Error ? error.message : error);
      process.exit(2);
    }
  });

program.parse();
