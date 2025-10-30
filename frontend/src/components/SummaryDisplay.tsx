// src/components/SummaryDisplay.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Markdown normalizer:
 * - Promote stand-alone **Title** lines to H3 headings
 * - Demote H1 (# …) to H2 (## …)
 * - Unbold label patterns like **Definition:** -> Definition:
 * - Strip remaining inline **bold** and *italics* so only headings are bold
 * - Collapse triple+ blank lines
 */
function cleanMarkdown(md: string): string {
  let out = md;

  // **Title**  -> ### Title   (standalone bold line becomes a heading)
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
  const md = cleanMarkdown(summary);

  // Use the SAME Card styles as QuizCard -> identical width and look
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
        <article
          className={[
            "prose prose-slate max-w-none", // no width cap
            // headings are bold; body isn’t
            "prose-h2:text-xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mt-6 prose-h2:mb-2",
            "prose-h3:text-lg prose-h3:font-bold prose-h3:text-gray-900 prose-h3:mt-5 prose-h3:mb-1",
            // body and lists
            "prose-p:text-gray-700 prose-p:leading-7 prose-p:my-3",
            "prose-ul:my-2 prose-ol:my-2 prose-li:my-1 marker:text-gray-400 prose-ul:pl-6 prose-ol:pl-6",
            "prose-a:text-indigo-600",
          ].join(" ")}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // ensure in-body **bold** and *italics* render as normal text
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
