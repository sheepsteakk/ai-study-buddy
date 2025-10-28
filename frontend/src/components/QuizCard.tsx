// src/components/QuizCard.tsx
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getFeedback } from '@/api/client'

type Props = {
  question: { question: string; options: string[]; correct_answer_index: number }
  questionNumber: number
  totalQuestions: number
  summary?: string
}

export default function QuizCard({ question, questionNumber, totalQuestions, summary }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fb, setFb] = useState<{correct:boolean; explanation:string; guidance?:string} | null>(null)

  const isCorrectLocal = selected !== null && selected === question.correct_answer_index

  const choose = async (i: number) => {
    if (show || loading) return
    setSelected(i)
    setShow(true)
    setLoading(true)
    try {
      const res = await getFeedback({
        question: question.question,
        choices: question.options,
        selected_index: i,
        answer_index: question.correct_answer_index,
        summary,
        explain_if_correct: true,
        detail: 'full',
      })
      // If API responds weirdly, still fall back to local correctness
      const ok = typeof res?.correct === 'boolean' ? res.correct : isCorrectLocal
      const explanation =
        (typeof res?.explanation === 'string' && res.explanation.trim().length > 0)
          ? res.explanation
          : isCorrectLocal
            ? 'Nice work — your choice matches the key idea in the summary.'
            : 'Review the key term/definition in the summary and compare it to each option.'
      setFb({ correct: ok, explanation, guidance: res?.guidance })
    } catch {
      // Tutor error: no more scary message — just a friendly fallback
      setFb({
        correct: isCorrectLocal,
        explanation: isCorrectLocal
          ? 'Correct — even though we could not fetch tutor notes, your answer aligns with the summary.'
          : 'We could not fetch tutor notes. Check the summary line that defines this concept and retry.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between mb-2">
          <Badge className="text-xs">Question {questionNumber} of {totalQuestions}</Badge>
          {/* removed the HelpCircle icon per your request */}
        </div>
        <CardTitle className="text-lg leading-relaxed text-gray-900">
          {question.question.replace(/\*/g, '')}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            const isSelected = selected === i
            const isAnswer = i === question.correct_answer_index

            let cls = "w-full justify-start text-left p-4 h-auto transition-all duration-200 "
            if (!show) cls += "hover:bg-blue-50 hover:border-blue-300"
            else if (isAnswer) cls += "bg-green-50 border-green-500 text-green-900"
            else if (isSelected) cls += "bg-red-50 border-red-500 text-red-900"
            else cls += "opacity-50"

            return (
              <Button
                key={i}
                variant="outline"
                className={cls}
                onClick={() => choose(i)}
                disabled={show || loading}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${
                    !show ? 'bg-gray-100 text-gray-700'
                    : isAnswer ? 'bg-green-500 text-white'
                    : isSelected ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="flex-1">{opt}</span>
                  {show && isAnswer && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  {show && isSelected && !isAnswer && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                </div>
              </Button>
            )
          })}
        </div>

        {show && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              isCorrectLocal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            {/* Only decide the title based on local correctness to avoid flashing the wrong state */}
            <p className={`font-semibold mb-1 ${isCorrectLocal ? 'text-green-900' : 'text-red-900'}`}>
              {isCorrectLocal ? 'Correct!' : 'Not quite right'}
            </p>

            {/* While waiting for tutor, show a calm “checking…” message */}
            {loading ? (
              <p className={`${isCorrectLocal ? 'text-green-800' : 'text-red-800'} text-sm`}>
                Checking your answer…
              </p>
            ) : (
              <>
                <p className={`${isCorrectLocal ? 'text-green-800' : 'text-red-800'} text-sm`}>
                  {fb?.explanation}
                </p>
                {fb?.guidance && <p className="text-sm mt-1">{fb.guidance}</p>}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
