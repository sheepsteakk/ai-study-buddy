import * as React from 'react'

export function Alert({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`} {...props} />
  )
}

export function AlertDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-red-800 ${className}`} {...props} />
}
