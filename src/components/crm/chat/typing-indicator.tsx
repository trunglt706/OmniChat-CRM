'use client'

import { Bot, User } from 'lucide-react'

export function TypingIndicator({ names = [], isBot = true }: { names?: string[], isBot?: boolean }) {
  return (
    <div className="flex items-end gap-2.5 px-1 py-2">
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shadow-sm ${isBot ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
        {isBot ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className={`rounded-2xl px-4 py-3 shadow-lg ${isBot ? 'bubble-bot shadow-violet-500/15' : 'bubble-agent shadow-indigo-500/15'}`}>
        <div className="flex flex-col gap-1">
          {names.length > 0 && <span className="text-[10px] opacity-70 font-semibold">{names.join(', ')} typing...</span>}
          <div className="flex items-center gap-1.5 h-3">
            <span className="typing-dot" style={{ animationDelay: '0s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
