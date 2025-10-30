// src/components/SummaryDisplay.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";

/**
 * Light normalization:
 * - Demote H1 → H2
 * - Unbold label patterns like **Definition:** → Definition:
 * - Collapse extra blank lines
 * - Strip emphasis (**bold**, *italic*) while preserving list bullets
 */
function cleanMarkdown(md: string): string {
  let out = md.replace(/^# (.+)$/gm, "## $1");
  out = out.replace(/\*\*([^\*\n]{1,60}?):\*\*/g, "$1:");
  out = out.replace(/\n{3,}/g, "\n\n");

  // remove **bold** anywhere
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  // remove *italic* but keep bullet lines like "* item"
  // (no closing * on bullets, so this won't match them)
  out = out.replace(/(^|[^*\n])\*([^*\n]+)\*/g, "$1$2");

  return out.trim();
}

type Props = { summary: string };

export default function SummaryDisplay({ summary }: Props) {
  const md = cleanMarkdown(summary);

  return (
    <section className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-4">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200/70 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden min-h-[400px] flex flex-col">
        {/* Header row */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200/70 bg-slate-50/40">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">AI-Generated Summary</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 lg:px-10 lg:py-8">
          <article
            className={[
              "prose prose-slate max-w-none",
              "prose-h2:text-xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mt-6 prose-h2:mb-2",
              "prose-h3:text-lg prose-h3:font-bold prose-h3:text-gray-900 prose-h3:mt-5 prose-h3:mb-1",
              "prose-p:text-gray-700 prose-p:leading-7 prose-p:my-3",
              "prose-ul:my-2 prose-ol:my-2 prose-li:my-1 marker:text-gray-400 prose-ul:pl-6 prose-ol:pl-6",
              "prose-a:text-indigo-600",
            ].join(" ")}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ node, ...props }) => (
                  <span {...props} className="font-semibold text-gray-900" />
                ),
                p: ({ node, ...props }) => (
                  <p {...props} className="leading-7 text-gray-700" />
                ),
                ul: ({ node, ...props }) => (
                  <ul {...props} className="list-disc pl-6 marker:text-gray-400" />
                ),
                ol: ({ node, ...props }) => (
                  <ol {...props} className="list-decimal pl-6 marker:text-gray-400" />
                ),
              }}
            >
              {md}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </section>
  );
}
