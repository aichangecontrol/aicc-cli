#!/usr/bin/env node
import { Command } from "commander";
import { validateSpec } from "./validate.js";
import { buildPlan } from "./plan.js";

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
    const result = validateSpec(filePath);
    if (!result.valid) {
      console.error("Validation failed:");
      for (const err of result.errors) {
        console.error(`- ${err}`);
      }
      process.exit(1);
    }
    console.log("Spec is valid.");
  });

program
  .command("plan")
  .argument("<path>", "Path to AICC spec YAML")
  .description("Output a normalized plan JSON")
  .action((filePath: string) => {
    const plan = buildPlan(filePath);
    console.log(JSON.stringify(plan, null, 2));
  });

program.parse();
