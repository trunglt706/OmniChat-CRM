'use client'

import { Bot } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 px-1 py-2">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="bubble-bot rounded-2xl px-4 py-3 shadow-lg shadow-violet-500/15">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" style={{ animationDelay: '0s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}
