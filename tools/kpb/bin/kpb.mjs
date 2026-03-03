#!/usr/bin/env node
import { Command } from "commander";
import { buildFromManifest } from "../src/pipeline/build.js";
import { publishRun } from "../src/pipeline/publish.js";
import { seedKnownIssues } from "../src/pipeline/seedKnownIssues.js";

const program = new Command();

program
  .name("kpb")
  .description("Knowledge Pack Builder (KPB) — enterprise offline knowledge pack pipeline")
  .version("1.0.0");

program
  .command("build")
  .requiredOption("--source <path>", "Path to source manifest JSON")
  .option("--out <dir>", "Output directory for artifacts", ".kpb-out")
  .action(async (opts) => {
    const result = await buildFromManifest({ manifestPath: opts.source, outDir: opts.out });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("publish")
  .requiredOption("--run-id <id>", "Run id from build output")
  .option("--out <dir>", "Output directory where artifacts are stored", ".kpb-out")
  .action(async (opts) => {
    const result = await publishRun({ runId: opts.runId, outDir: opts.out });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("seed-known-issues")
  .option("--seed <path>", "Seed file path", "tools/kpb/seeds/known-issues.seed.json")
  .action(async (opts) => {
    const result = await seedKnownIssues({ seedPath: opts.seed });
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
