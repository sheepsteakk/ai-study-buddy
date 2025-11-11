// src/components/SummaryDisplay.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** digits -> Unicode subscripts */
function toSubscriptDigits(s: string) {
  const map: Record<string, string> = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
  return s.replace(/[0-9]/g, d => map[d] || d);
}

/** science-aware tweaks */
function normalizeScience(md: string): string {
  let out = md;
  out = out.replace(/\$?\\xrightarrow\{([^}]+)\}\$?/g, "→ ($1)");
  out = out.replace(/\$?\\rightarrow\$?/g, "→");
  out = out.replace(/\$?\\leftrightarrow\$?/g, "↔");
  out = out.replace(/\$?\\rightleftharpoons\$?/g, "⇌");
  out = out.replace(/--?>|⇒/g, "→");
  out = out.replace(/\$(.*?)\$/g, "$1");
  out = out.replace(/\b([A-Z][a-z]?)(\d+)\b/g, (_m, e: string, n: string) => e + toSubscriptDigits(n));
  for (let i = 0; i < 3; i++) out = out.replace(/([A-Z][a-z]?)(\d+)/g, (_m, e: string, n: string) => e + toSubscriptDigits(n));
  out = out.replace(/\s*→\s*/g, " → ");
  return out;
}

/** markdown presentation cleanup */
function cleanMarkdown(md: string): string {
  let out = md;
  out = out.replace(/^\s*\*\*([^*\n]+)\*\*\s*$/gm, "### $1"); // bold line -> H3
  out = out.replace(/^#\s+(.+)$/gm, "## $1");                 // H1 -> H2
  out = out.replace(/\*\*([A-Za-z][A-Za-z0-9 \-/]{1,60}):\*\*/g, "$1:"); // **Label:** -> Label:
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "$1");              // strip bold
  out = out.replace(/(^|[^*])\*([^*\n ][^*\n]*?)\*(?!\*)/g, "$1$2"); // strip italics
  out = out.replace(/\n{3,}/g, "\n\n").trim();                // collapse blanks
  return out;
}

type Props = { summary: string };

export default function SummaryDisplay({ summary }: Props) {
  const md = cleanMarkdown(normalizeScience(summary));

  return (
    <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          AI-Generated Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <article className="prose prose-slate max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // clean large section headers (no accent bar)
              h2: ({ children, ...props }) => (
                <h2
                  {...props}
                  className="mt-10 mb-4 text-[1.6rem] md:text-3xl font-bold tracking-tight text-gray-900"
                >
                  {children}
                </h2>
              ),
              // smaller, muted subheaders
              h3: ({node, ...props}) => (
                <h3
                  {...props}
                  className="mt-6 mb-2 text-lg font-semibold text-gray-700"
                />
              ),
              // paragraphs & lists unchanged
              p:  ({node, ...props}) => <p {...props} className="my-3 leading-7 text-gray-700" />,
              ul: ({node, ...props}) => <ul {...props} className="my-2 list-disc pl-6 marker:text-gray-400" />,
              ol: ({node, ...props}) => <ol {...props} className="my-2 list-decimal pl-6 marker:text-gray-400" />,
              strong: ({node, ...props}) => <span {...props} className="font-normal" />,
              em:     ({node, ...props}) => <span {...props} className="not-italic" />,
            }}
          >
            {md}
          </ReactMarkdown>
        </article>
      </CardContent>
    </Card>
  );
}
