export async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "KPB/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return await res.text();
}

export function allowlisted(url, includePatterns, excludePatterns) {
  const inc = includePatterns.length ? includePatterns.some((r) => r.test(url)) : true;
  const exc = excludePatterns.some((r) => r.test(url));
  return inc && !exc;
}

export function extractLinks(html) {
  return Array.from(html.matchAll(/href="(https?:\/\/[^"]+)"/g)).map((m) => m[1]);
}
