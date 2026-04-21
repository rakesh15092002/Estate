import React, { useState, useRef, useEffect, useCallback } from 'react'
import { getAgentStatus, sendMessage } from '../services/api'

const SESSION_ID = 'default_user'

const TERMINAL_STEP = new Set(['done', 'complete', 'skipped', 'error'])

function stepsSettled(steps) {
  if (!steps?.length) return false
  return steps.every((s) => TERMINAL_STEP.has(s.status))
}

const QUICK_PROMPTS = [
  'Find a studio in Austin under $2k',
  '2BD apartment, pet friendly, Brooklyn',
  'Show me listings near downtown',
  'I have a dog, find pet-friendly places',
]

const BOT_AVATAR = (
  <div
    className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
    style={{
      background: 'linear-gradient(135deg, #C9A84C, #8A6E2F)',
      boxShadow: '0 0 12px rgba(201,168,76,0.3)',
    }}
  >
    <span className="text-xs font-bold text-[#0A0E1A]" style={{ fontFamily: 'DM Mono' }}>
      ES
    </span>
  </div>
)

const USER_AVATAR = (
  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[#2A3452] border border-[#4A5568]">
    <svg className="w-4 h-4 text-[#9AA0B0]" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  </div>
)

function LoadingBubble() {
  return (
    <div className="flex gap-3">
      {BOT_AVATAR}
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-[rgba(201,168,76,0.12)] bg-[#1A2340] px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-[#C9A84C] animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-xs text-[#9AA0B0]">EstateScout is thinking…</span>
      </div>
    </div>
  )
}

function formatAgentSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null
  return steps
    .map((s) => {
      if (typeof s === 'string') return s
      const node = s.node ?? s.name ?? 'step'
      const status = s.status ?? ''
      const extra = s.detail || s.message
      return [node, status, extra].filter(Boolean).join(' · ')
    })
    .join(' → ')
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const stepsLine = !isUser ? formatAgentSteps(msg.agent_steps) : null

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {isUser ? USER_AVATAR : BOT_AVATAR}
      <div className={`flex max-w-[75%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm bg-[#C9A84C] font-medium text-[#0A0E1A]'
              : 'rounded-tl-sm border border-[rgba(201,168,76,0.12)] bg-[#1A2340] text-[#F0EDE6]'
          }`}
        >
          {msg.content}
        </div>
        {stepsLine && (
          <p className="max-w-full px-1 text-[10px] leading-snug text-[#6B7280]">{stepsLine}</p>
        )}
        <span className="px-1 text-[10px] text-[#4A5568]">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function errorDetail(err) {
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return d
  if (d && typeof d === 'object' && d.message) return String(d.message)
  if (err?.message) return err.message
  return 'Something went wrong. Check that the API is running on port 8000.'
}

/**
 * @param {{ onAgentUpdate?: (steps: unknown[]) => void }} props
 */
export default function ChatWindow({ onAgentUpdate }) {
  const pollIntervalRef = useRef(null)

  const stopAgentPolling = useCallback(() => {
    if (pollIntervalRef.current != null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => () => stopAgentPolling(), [stopAgentPolling])

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to EstateScout. I'm your property agent — share budget, bedrooms, location, and pet needs, and I'll search listings for you.",
      timestamp: Date.now(),
      agent_steps: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    stopAgentPolling()
    pollIntervalRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const s = await getAgentStatus(SESSION_ID)
          if (s.error) {
            stopAgentPolling()
            if (s.steps?.length) onAgentUpdate?.(s.steps)
            return
          }
          const failedStep = (s.steps || []).some((st) => st.status === 'error')
          if (failedStep) {
            stopAgentPolling()
            onAgentUpdate?.(s.steps || [])
            return
          }
          const done =
            !s.running && s.steps?.length && stepsSettled(s.steps) && !s.error
          if (done) {
            stopAgentPolling()
            onAgentUpdate?.(s.steps || [])
          }
        } catch {
          /* offline — keep interval until chat returns or completed */
        }
      })()
    }, 450)

    try {
      const data = await sendMessage(content)
      stopAgentPolling()
      if (data.agent_steps?.length) onAgentUpdate?.(data.agent_steps)
      if (Array.isArray(data.properties) && data.properties.length > 0) {
        window.dispatchEvent(new Event('properties-updated'))
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: data.reply ?? data.message ?? '',
          timestamp: Date.now(),
          agent_steps: data.agent_steps ?? [],
        },
      ])
    } catch (err) {
      stopAgentPolling()
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorDetail(err)}`,
          timestamp: Date.now(),
          agent_steps: [],
        },
      ])
    } finally {
      stopAgentPolling()
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(201,168,76,0.1)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {BOT_AVATAR}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111827] bg-[#22C97B]" />
          </div>
          <div>
            <p
              className="text-sm font-medium text-[#F0EDE6]"
              style={{ fontFamily: 'Cormorant Garamond', fontSize: '16px' }}
            >
              EstateScout Agent
            </p>
            <p className="font-mono text-[10px] tracking-wider text-[#22C97B]">● ONLINE</p>
          </div>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && <LoadingBubble />}
        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleSend(p)}
            disabled={loading}
            className="shrink-0 whitespace-nowrap rounded-full border border-[rgba(201,168,76,0.2)] bg-[#111827] px-3 py-1.5 text-[11px] text-[#9AA0B0] transition-all duration-200 hover:border-[#C9A84C] hover:text-[#C9A84C] disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[#111827] p-3 transition-colors focus-within:border-[rgba(201,168,76,0.4)]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Describe your ideal property…"
            rows={1}
            disabled={loading}
            className="max-h-32 min-h-[40px] flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-[#F0EDE6] placeholder-[#4A5568] outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-semibold text-[#0A0E1A] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              background:
                input.trim() && !loading ? 'linear-gradient(135deg, #C9A84C, #8A6E2F)' : '#2A3452',
            }}
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-[#4A5568]">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
