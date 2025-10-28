import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, GraduationCap, Brain } from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const tabs = [
    { label: 'Summarize', url: '/summarize', icon: BookOpen },
    { label: 'Study Mode', url: '/study', icon: GraduationCap },
  ]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="app-shell px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  StudySpark AI
                </h1>
                <p className="text-xs text-gray-600">Your intelligent learning companion</p>
              </div>
            </div>

            <div className="flex gap-2">
              {tabs.map(t => {
                const active = location.pathname === t.url
                const Icon = t.icon
                return (
                  <Link
                    key={t.label}
                    to={t.url}
                    className={`nav-pill ${active ? 'nav-pill--active' : 'nav-pill--idle'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200 mt-12">
        <div className="app-shell px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          <p>StudySpark AI — Powered by advanced AI to help you learn faster</p>
          <p className="mt-1 text-xs">© 2025 Crafted with passion by Zhen Ying (ɔ◔‿◔)ɔ ♥</p>
        </div>
      </footer>
    </div>
  )
}
