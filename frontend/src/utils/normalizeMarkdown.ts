// frontend/src/lib/normalizeMarkdown.ts
export function normalizeMarkdown(input: string): string {
  let s = input ?? "";

  // 1) Fix headings that came as "1. Title" -> "## Title"
  s = s.replace(/^\s*\d+\.\s+(.*)$/gm, '## $1');

  // 2) Lines that start with "*** " were meant to be bullets
  //    e.g. "*** Cell Wall: ** ..." -> "- **Cell Wall:** ..."
  s = s.replace(/^\s*\*{3}\s+(.*)$/gm, '- $1');

  // 3) Collapse accidental triple asterisks around text to bold
  //    "***Term***" -> "**Term**"
  s = s.replace(/\*{3}([^\*\n]+)\*{3}/g, '**$1**');

  // 4) Trim spaces just inside bold delimiters:
  //    "** Term : **" -> "**Term:**"
  s = s.replace(/\*\*\s*([^*\n][^*]*?)\s*\*\*/g, (_, inner) => `**${inner.trim()}**`);

  // 5) If a term is bold then immediately followed by a colon with spaces, pull the colon inside bold
  //    "**Term** :" -> "**Term:**"
  s = s.replace(/\*\*([^\*\n]+?)\*\*\s*:/g, '**$1:**');

  // 6) Any lonely single asterisks that aren’t emphasis become a bullet dot
  //    We leave pairs "**" intact
  s = s.replace(/(?<!\*)\*(?!\*)/g, '•');

  // 7) Ensure list items start cleanly with "- "
  s = s.replace(/^\s*-\s*(?!\s)/gm, match => match.replace(/\s+/g, ' '));

  // 8) Squeeze excessive blank lines
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
