import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Normalize LLM markdown:
 * - Demote H1 → H2
 * - Remove **Definition:** / **Topic headers** style
 * - Flatten bold-only lines like **Core Biological Concepts**
 * - Collapse excessive blank lines
 */
function cleanMarkdown(md: string): string {
  let out = md.replace(/^# (.+)$/gm, "## $1");
  out = out.replace(/\*\*([^\*\n]{1,60}?):\*\*/g, "$1:");
  out = out.replace(/\*\*([A-Z][A-Za-z\s]+)\*\*/gm, "$1"); // remove bold headings like **Core Biological Concepts**
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

type Props = { summary: string };

export default function SummaryDisplay({ summary }: Props) {
  const md = cleanMarkdown(summary);

  return (
    <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            AI-Generated Summary
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
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
      </CardContent>
    </Card>
  );
}
