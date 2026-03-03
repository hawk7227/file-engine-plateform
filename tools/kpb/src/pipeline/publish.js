import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "../supabaseClient.js";
import { getStorage } from "../storage/index.js";

async function readJson(p) {
  const s = await fs.readFile(p, "utf-8");
  return JSON.parse(s);
}

export async function publishRun({ runId, outDir }) {
  const sb = getSupabaseAdmin();
  const storage = getStorage();

  const runDir = path.join(outDir, runId);
  const summary = await readJson(path.join(runDir, "run.summary.json"));

  const { data: runRows, error: runErr } = await sb
    .from("knowledge_ingest_runs")
    .insert({ source_id: null, status: "running", summary: "KPB publish started", stats: { runId }, started_at: new Date().toISOString() })
    .select();

  if (runErr) throw runErr;
  const ingestRunId = runRows?.[0]?.id;

  const docsDir = path.join(runDir, "docs");
  const chunksDir = path.join(runDir, "chunks");
  const docFiles = await fs.readdir(docsDir);

  let docsPublished = 0;
  let chunksPublished = 0;

  for (const fn of docFiles) {
    const docBundle = await readJson(path.join(docsDir, fn));
    const { doc, content_md } = docBundle;

    const docKey = `kpb/${runId}/docs/${fn.replace(/\.json$/, ".md")}`;
    const docPut = await storage.putObject(docKey, new TextEncoder().encode(content_md), "text/markdown");

    const { data: docRows, error: docErr } = await sb
      .from("knowledge_documents")
      .insert({
        source_id: null,
        pack: doc.pack,
        version: doc.version,
        title: doc.title,
        canonical_ref: doc.canonical_ref,
        source_url: doc.source_url,
        content_hash: doc.content_hash,
        fetched_at: doc.fetched_at,
        meta: doc.meta,
        storage_bucket: docPut.bucket,
        storage_path: docPut.path,
        byte_size: content_md.length,
        mime_type: "text/markdown"
      })
      .select();

    if (docErr) throw docErr;
    const documentId = docRows?.[0]?.id;
    docsPublished++;

    const chunkBundle = await readJson(path.join(chunksDir, fn));
    const chunks = chunkBundle.chunks;

    // v1 default: store chunk text in DB (OK for moderate size). For 2GB, switch to pointer mode.
    for (const c of chunks) {
      const { error: chErr } = await sb.from("knowledge_chunks").insert({
        document_id: documentId,
        chunk_index: c.chunk_index,
        content: c.content,
        tokens_est: null,
        source_url: c.source_url,
        content_hash: c.content_hash,
        meta: c.meta
      });
      if (chErr) throw chErr;
      chunksPublished++;
    }
  }

  await sb.from("knowledge_ingest_runs").update({
    status: "pass",
    summary: "KPB publish complete",
    stats: { runId, docsPublished, chunksPublished, outputs: summary.outputs?.length ?? 0 },
    finished_at: new Date().toISOString()
  }).eq("id", ingestRunId);

  return { ingestRunId, docsPublished, chunksPublished };
}
