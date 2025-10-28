import React, { useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function FileUpload({
  onFileSelect,
  isProcessing,
}: {
  onFileSelect: (f: File | null) => void
  isProcessing: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<File | null>(null)

  const pick = () => inputRef.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setSelected(f)
    onFileSelect(f)
  }

  return (
    <Card className="dropzone">
      <div className="p-10 md:p-14">
        {!selected ? (
          <div className="text-center">
            <div className="upload-glyph">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Upload your study material
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your PDF here, or click to browse
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onChange}
            />

            <Button onClick={pick} disabled={isProcessing} className="btn-primary h-12 px-6">
              <FileText className="w-4 h-4 mr-2" />
              Choose PDF File
            </Button>

            <p className="text-xs text-gray-500 mt-4">Supports PDF files up to 10MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium">{selected.name}</p>
                <p className="text-sm text-gray-600">
                  {(selected.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isProcessing && (
              <Button variant="outline" size="icon" onClick={() => { setSelected(null); onFileSelect(null) }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
