// frontend/src/utils/normalizeMarkdown.ts
// Turn plain text like "I. Title" and "Label: value" into tidy Markdown.

const ROMAN = /^(?:[IVXLCDM]+)\./i;
const arabicHeading = /^(\d+)\.\s+(.+)/;

export function normalizeMarkdown(input: string): string {
  if (!input) return "";

  // Split into lines, trim right spaces
  const lines = input.replace(/\r\n/g, "\n").split("\n").map(l => l.replace(/\s+$/,""));

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Collapse repeated blank lines
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    // Promote roman numeral sections like "I. Core Divisions of Anatomy"
    if (ROMAN.test(line.trim())) {
      const title = line.trim().replace(ROMAN, "").trim();
      if (out.length && out[out.length - 1] !== "") out.push("");
      out.push(`## ${title}`);
      out.push("");
      continue;
    }

    // Promote numeric top-level sections like "2. Something"
    const m = line.match(arabicHeading);
    if (m && m[2] && m[1].length <= 2) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      out.push(`## ${m[2].trim()}`);
      out.push("");
      continue;
    }

    // Turn “Label: Value” into a bullet with bold label
    const colon = line.indexOf(":");
    if (colon > 0 && colon < 60) {
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (key && val) {
        out.push(`- **${key}:** ${val}`);
        continue;
      }
    }

    // Keep existing bullets as bullets
    if (/^\s*[-*]\s+/.test(line)) {
      out.push(line);
      continue;
    }

    // If the line looks like a short topic phrase, make it a sub-bullet
    if (line.length <= 120 && /^[A-Z][^.!?]{2,}$/.test(line)) {
      out.push(`- ${line}`);
      continue;
    }

    // Otherwise just keep the line
    out.push(line);
  }

  // Final tidy: remove triple blanks, unwrap stray asterisks from model
  let md = out.join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\*\s*(\w[\s\w-]{0,40})\s*\*/g, "*$1*"); // keep italics if intended

  return md.trim();
}
