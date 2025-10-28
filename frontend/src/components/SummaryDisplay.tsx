import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function SummaryDisplay({ summary }: { summary: string }) {
  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          AI-Generated Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose prose-blue max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-bold mb-3 mt-6 text-gray-900" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg font-bold mb-2 mt-4 text-gray-900" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="leading-relaxed mb-4 font-normal text-gray-800" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 font-normal text-gray-800" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside space-y-2 mb-4 font-normal text-gray-800" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="ml-4 font-normal text-gray-800" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-normal text-gray-800" {...props} />
              ),
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
