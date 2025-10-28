import * as React from 'react'

const TabsContext = React.createContext<{ value: string; setValue: (v: string) => void } | null>(
  null
)

export function Tabs({
  defaultValue,
  children,
  className = '',
}: {
  defaultValue: string
  children: React.ReactNode
  className?: string
}) {
  const [value, setValue] = React.useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`flex gap-2 rounded-xl bg-gray-100 p-1 ${className}`}>{children}</div>
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = React.useContext(TabsContext)!
  const active = ctx.value === value
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={`h-10 rounded-lg px-4 text-sm font-medium transition ${
        active ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      type="button"
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = React.useContext(TabsContext)!
  if (ctx.value !== value) return null
  return <div className={className}>{children}</div>
}
