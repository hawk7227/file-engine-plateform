import fs from "node:fs/promises";
import { getSupabaseAdmin } from "../supabaseClient.js";

async function readJson(p) {
  const s = await fs.readFile(p, "utf-8");
  return JSON.parse(s);
}

export async function seedKnownIssues({ seedPath }) {
  const sb = getSupabaseAdmin();
  const seed = await readJson(seedPath);

  let inserted = 0;
  for (const item of seed.items ?? []) {
    const { error } = await sb.from("knowledge_fixes").insert({
      scope: "global",
      signature: item.signature,
      symptoms: item.symptoms ?? {},
      root_cause: item.root_cause ?? null,
      fix_steps: (item.fix_steps ?? []).join("\n"),
      patch_template: item.patch_template ?? null,
      confidence: item.confidence ?? 0.8
    });
    if (!error) inserted++;
  }

  return { inserted };
}
