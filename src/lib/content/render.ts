import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** Markdown → safe HTML (AI and member-edited content is never trusted as raw HTML). */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false, gfm: true }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "br", "hr", "code"],
    allowedAttributes: { a: ["href", "title", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener nofollow", target: "_blank" }) },
  });
}
