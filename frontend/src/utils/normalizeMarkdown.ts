export function normalizeMarkdown(src: string): string {
  if (!src) return "";

  let s = src.replace(/\r\n/g, "\n");
  s = s.replace(/^\s*[•·●▪►]+\s?/gm, "- ");
  s = s.replace(/^\s*\*(?!\*)(?!\s*\*)\s?/gm, "- ");
  s = s.replace(/^\s*-\s*$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/^(.*\S)\s+$/gm, "$1");

  return s.trim();
}
