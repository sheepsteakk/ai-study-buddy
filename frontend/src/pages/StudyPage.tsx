import React, { useState } from 'react'
import { GraduationCap, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileUpload from '@/components/FileUpload'
import SummaryDisplay from '@/components/SummaryDisplay'
import QuizCard from '@/components/QuizCard'
import { studyFromPdf } from '@/api/client'

export default function StudyPage() {
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<any[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const res = await studyFromPdf(file)
      setSummary(res.summary)
      setQuiz(res.quiz)
    } catch (e: any) {
      setError(e.message || 'Failed to generate study materials')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setFile(null); setSummary(null); setQuiz(null); setError(null) }

  return (
    <div className="app-shell px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="header-tile bg-gradient-to-br from-indigo-600 to-purple-600">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Study Mode</h1>
            <p className="text-gray-600">Get summaries and quiz questions from your materials</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!summary && !quiz ? (
        <div className="space-y-6">
          <FileUpload onFileSelect={setFile} isProcessing={busy} />

          {file && !busy && (
            <div>
              <Button
                onClick={run}
                disabled={!file || busy}
                className="w-full btn-primary--purple h-12 text-base disabled:opacity-60"
              >
                {busy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                <CheckCircle className="w-5 h-5 mr-2" />
                Generate Study Materials
              </Button>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-lg font-medium">Creating your study materials...</p>
              <p className="text-sm text-gray-600 mt-2">This may take up to 30 seconds</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={reset} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Study Another Document
          </Button>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="summary" className="text-base"> Summary</TabsTrigger>
              <TabsTrigger value="quiz" className="text-base">
                 Quiz ({quiz?.length || 0} questions)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              <SummaryDisplay summary={summary || ''} />
            </TabsContent>

            <TabsContent value="quiz" className="mt-6">
              <div className="space-y-6">
                {quiz?.map((q, i) => (
                  <QuizCard
                    key={i}
                    question={{
                      question: q.question,
                      options: q.choices,
                      correct_answer_index: q.answer_index
                    }}
                    questionNumber={i + 1}
                    totalQuestions={quiz.length}
                    summary={summary || undefined}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
