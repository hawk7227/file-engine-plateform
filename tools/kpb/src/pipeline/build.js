import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fetchText, allowlisted, extractLinks } from "../web/fetch.js";
import { htmlToMarkdown, compactWhitespace } from "../text/normalize.js";
import { chunkText } from "../text/chunk.js";

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function readJson(p) {
  const s = await fs.readFile(p, "utf-8");
  return JSON.parse(s);
}

export async function buildFromManifest({ manifestPath, outDir }) {
  const manifest = await readJson(manifestPath);
  const runId = crypto.randomUUID();
  const runDir = path.join(outDir, runId);
  await fs.mkdir(runDir, { recursive: true });

  const chunkSize = manifest.chunking?.chunk_size ?? 900;
  const chunkOverlap = manifest.chunking?.chunk_overlap ?? 120;

  const outputs = [];

  for (const src of manifest.sources) {
    const include = (src.include_patterns ?? []).map((p) => new RegExp(p));
    const exclude = (src.exclude_patterns ?? []).map((p) => new RegExp(p));
    const maxPages = src.max_pages ?? 500;

    const q = [...(src.seed_urls ?? [])];
    const seen = new Set(q);
    let pages = 0;

    while (q.length && pages < maxPages) {
      const url = q.shift();
      if (!allowlisted(url, include, exclude)) continue;

      let html;
      try { html = await fetchText(url); } catch { continue; }

      const md = compactWhitespace(htmlToMarkdown(html));
      if (!md || md.length < 200) continue;

      pages++;
      const contentHash = sha256(md);
      const version = new Date().toISOString().slice(0, 10);

      const doc = {
        source_id: src.id,
        pack: src.pack,
        version,
        title: url,
        canonical_ref: url,
        source_url: url,
        content_hash: contentHash,
        fetched_at: new Date().toISOString(),
        meta: { origin: "web", url, pack: src.pack, src: src.id }
      };

      const safeName = encodeURIComponent(url);
      const docPath = path.join(runDir, "docs", `${safeName}.json`);
      await fs.mkdir(path.dirname(docPath), { recursive: true });
      await fs.writeFile(docPath, JSON.stringify({ doc, content_md: md }, null, 2), "utf-8");

      const chunks = chunkText(md, chunkSize, chunkOverlap).map((c, idx) => ({
        chunk_index: idx,
        content: c,
        source_url: url,
        content_hash: contentHash,
        meta: { url, pack: src.pack, src: src.id }
      }));

      const chunksPath = path.join(runDir, "chunks", `${safeName}.json`);
      await fs.mkdir(path.dirname(chunksPath), { recursive: true });
      await fs.writeFile(chunksPath, JSON.stringify({ doc, chunks }, null, 2), "utf-8");

      outputs.push({ url, pack: src.pack, version, chunks: chunks.length, content_hash: contentHash });

      for (const link of extractLinks(html)) {
        if (seen.has(link)) continue;
        seen.add(link);
        if (allowlisted(link, include, exclude)) q.push(link);
      }
    }
  }

  const summary = { runId, created_at: new Date().toISOString(), outputs, manifest };
  await fs.writeFile(path.join(runDir, "run.summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  return summary;
}
