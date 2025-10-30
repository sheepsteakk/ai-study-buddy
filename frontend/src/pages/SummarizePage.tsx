import React, { useState } from 'react'
import { BookOpen, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import FileUpload from '@/components/FileUpload'
import SummaryDisplay from '@/components/SummaryDisplay'
import { summarizePdf } from '@/api/client'
import { normalizeMarkdown } from '../utils/normalizeMarkdown' // ✅ added

export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const { summary } = await summarizePdf(file)
      setSummary(summary)
    } catch (e: any) {
      setError(e.message || 'Failed to generate summary')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setFile(null); setSummary(null); setError(null) }

  return (
    <div className="app-shell px-4 sm:px-6 lg:px-8 py-10">
      {/* Section header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="header-tile bg-gradient-to-br from-blue-600 to-indigo-600">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Document Summarizer</h1>
            <p className="text-gray-600">Get AI-powered summaries of your study materials</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!summary ? (
        <div className="space-y-6">
          <FileUpload onFileSelect={setFile} isProcessing={busy} />

          {file && !busy && (
            <div className="flex">
              <Button
                onClick={run}
                disabled={!file || busy}
                className="btn-primary h-12 text-base flex-1 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                Generate Summary
              </Button>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium">Analyzing your document...</p>
              <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={reset} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Summarize Another Document
          </Button>

          {/* wrapped normalized markdown */}
          <div className="markdown">
            <SummaryDisplay summary={normalizeMarkdown(summary)} />
          </div>
        </div>
      )}
    </div>
  )
}
