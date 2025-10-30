// src/components/SummaryDisplay.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Convert digits to Unicode subscripts (for H2O -> H₂O, CO2 -> CO₂, etc.)
 */
function toSubscriptDigits(s: string) {
  const map: Record<string, string> = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
  return s.replace(/[0-9]/g, d => map[d] || d);
}

/**
 * Science-aware normalizer:
 * - Turn LaTeX-ish arrows into plain arrows, e.g. $\xrightarrow{sunlight}$ -> → (sunlight)
 * - Replace ->, -->, => with → and ⇌ where appropriate (keeps text readable)
 * - Subscript digits in simple chemical formula tokens (NaCl stays, H2O -> H₂O, CO2 -> CO₂)
 * - Strip math $...$ fences
 */
function normalizeScience(md: string): string {
  let out = md;

  // 1) $\xrightarrow{...}$ or \xrightarrow{...} -> → (... )
  out = out.replace(/\$?\\xrightarrow\{([^}]+)\}\$?/g, "→ ($1)");

  // 2) Other LaTeX arrows like $\rightarrow$ -> →
  out = out.replace(/\$?\\rightarrow\$?/g, "→");
  out = out.replace(/\$?\\leftrightarrow\$?/g, "↔");
  out = out.replace(/\$?\\rightleftharpoons\$?/g, "⇌");

  // 3) Plain text arrows
  out = out.replace(/--?>|⇒/g, "→");

  // 4) Strip leftover single-dollar math fences (keep contents)
  out = out.replace(/\$(.*?)\$/g, "$1");

  // 5) Subscript digits for common chemical tokens:
  //    pattern: Word with caps then digits, e.g. H2, CO2, SO4, C6H12O6
  //    We subscript any digits that immediately follow a chemical element letter.
  out = out.replace(/\b([A-Z][a-z]?)(\d+)\b/g, (_m, elem: string, nums: string) => {
    return elem + toSubscriptDigits(nums);
  });
  // Also handle chained formulas like C6H12O6 -> C₆H₁₂O₆ (repeat until stable)
  for (let i = 0; i < 3; i++) {
    out = out.replace(/([A-Z][a-z]?)(\d+)/g, (_m, e: string, n: string) => e + toSubscriptDigits(n));
  }

  // 6) Collapse multiple spaces around arrows
  out = out.replace(/\s*→\s*/g, " → ");

  return out;
}

/**
 * Markdown normalizer (presentation rules):
 * - Promote stand-alone **Title** lines to H3
 * - Demote H1 (# …) to H2 (## …)
 * - Unbold label patterns like **Definition:** -> Definition:
 * - Strip remaining inline **bold** and *italics* so only headings are bold
 * - Collapse triple+ blank lines
 */
function cleanMarkdown(md: string): string {
  let out = md;

  // **Title** (standalone bold line) -> ### Title
  out = out.replace(/^\s*\*\*([^*\n]+)\*\*\s*$/gm, "### $1");

  // # H1 -> ## H2
  out = out.replace(/^#\s+(.+)$/gm, "## $1");

  // **Definition:** / **Mechanism:** etc. -> plain label
  out = out.replace(/\*\*([A-Za-z][A-Za-z0-9 \-/]{1,60}):\*\*/g, "$1:");

  // remove remaining **bold** but keep text
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "$1");

  // remove single-asterisk italics (don’t touch list bullets)
  out = out.replace(/(^|[^*])\*([^*\n ][^*\n]*?)\*(?!\*)/g, "$1$2");

  // collapse extra blank lines
  out = out.replace(/\n{3,}/g, "\n\n").trim();

  return out;
}

type Props = { summary: string };

export default function SummaryDisplay({ summary }: Props) {
  // Science-aware fixes first, then presentation cleanup
  const md = cleanMarkdown(normalizeScience(summary));

  // Identical visual container as QuizCard (same Card, borders, max width driven by parent page)
  return (
    <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 h-5 text-white" />
          </div>
          AI-Generated Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <article
          className={[
            "prose prose-slate max-w-none",
            // Headings bold; body normal
            "prose-h2:text-xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mt-6 prose-h2:mb-2",
            "prose-h3:text-lg prose-h3:font-bold prose-h3:text-gray-900 prose-h3:mt-5 prose-h3:mb-1",
            // Body text / lists
            "prose-p:text-gray-700 prose-p:leading-7 prose-p:my-3",
            "prose-ul:my-2 prose-ol:my-2 prose-li:my-1 marker:text-gray-400 prose-ul:pl-6 prose-ol:pl-6",
            "prose-a:text-indigo-600",
          ].join(" ")}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // keep headings bold via CSS; paragraphs/lists normal weight
              strong: ({ node, ...props }) => <span {...props} className="font-normal" />,
              em: ({ node, ...props }) => <span {...props} className="not-italic" />,
              p: ({ node, ...props }) => <p {...props} className="leading-7 text-gray-700" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-6 marker:text-gray-400" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-6 marker:text-gray-400" />,
            }}
          >
            {md}
          </ReactMarkdown>
        </article>
      </CardContent>
    </Card>
  );
}
