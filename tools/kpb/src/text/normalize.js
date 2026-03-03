import TurndownService from "turndown";

const td = new TurndownService({ codeBlockStyle: "fenced" });

export function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}

export function htmlToMarkdown(html) {
  const clean = sanitizeHtml(html);
  return td.turndown(clean);
}

export function compactWhitespace(text) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
