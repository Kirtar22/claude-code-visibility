import { useState } from 'react'
import { X, ChevronDown, ChevronRight, AlertCircle, Brain, Terminal, MessageSquare, FileText, Cpu } from 'lucide-react'
import { useSessionDetail } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { ConversationMessage } from '../types'

type MsgType = 'text' | 'thinking' | 'tool_use' | 'tool_result'

const TYPE_FILTERS: { key: MsgType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'text', label: 'Text', icon: <MessageSquare size={12} />, color: '#60a5fa' },
  { key: 'thinking', label: 'Thinking', icon: <Brain size={12} />, color: '#a78bfa' },
  { key: 'tool_use', label: 'Tool Use', icon: <Terminal size={12} />, color: '#34d399' },
  { key: 'tool_result', label: 'Results', icon: <FileText size={12} />, color: '#f59e0b' },
]

function JsonBlock({ data, maxLines = 20 }: { data: unknown; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const lines = text.split('\n')
  const truncated = !expanded && lines.length > maxLines
  const display = truncated ? lines.slice(0, maxLines).join('\n') + '\n…' : text

  return (
    <div>
      <pre
        className="text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
        style={{ color: '#94a3b8', fontFamily: 'monospace' }}
      >
        {display}
      </pre>
      {lines.length > maxLines && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs mt-1"
          style={{ color: '#10b981' }}
        >
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  )
}

function ThinkingBlock({ msg }: { msg: ConversationMessage }) {
  const [open, setOpen] = useState(false)
  const preview = (msg.content ?? '').slice(0, 120)

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#1a1330', border: '1px solid #4c1d9520' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-2 p-3 text-left"
      >
        <Brain size={14} style={{ color: '#a78bfa', marginTop: 1, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Thinking</span>
          {!open && (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#6d5fa0' }}>
              {preview}{preview.length < (msg.content ?? '').length ? '…' : ''}
            </p>
          )}
        </div>
        <div style={{ color: '#6d5fa0', flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3" style={{ borderTop: '1px solid #4c1d9520' }}>
          <p className="text-xs leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: '#8b7ec8' }}>
            {msg.content}
          </p>
        </div>
      )}
    </div>
  )
}

function ToolUseBlock({ msg, resultMsg }: { msg: ConversationMessage; resultMsg?: ConversationMessage }) {
  const [inputOpen, setInputOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const isMcp = (msg.tool_name ?? '').startsWith('mcp__')
  const displayName = isMcp
    ? (msg.tool_name ?? '').split('__').slice(1, 3).join('/')
    : (msg.tool_name ?? '')

  const hasInput = msg.tool_input && Object.keys(msg.tool_input).length > 0
  const hasResult = !!resultMsg

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: isMcp ? '#0d1f15' : '#0f1a0f',
        border: `1px solid ${isMcp ? '#10b98130' : '#22c55e30'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Terminal size={13} style={{ color: '#34d399', flexShrink: 0 }} />
        <span className="text-xs font-semibold font-mono flex-1" style={{ color: '#34d399' }}>
          {displayName}
        </span>
        {isMcp && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f472b620', color: '#f472b6' }}>
            MCP
          </span>
        )}
      </div>

      {/* Input */}
      {hasInput && (
        <div style={{ borderTop: '1px solid #10b98120' }}>
          <button
            onClick={() => setInputOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
          >
            {inputOpen ? <ChevronDown size={11} style={{ color: '#475569' }} /> : <ChevronRight size={11} style={{ color: '#475569' }} />}
            <span className="text-xs" style={{ color: '#64748b' }}>Input</span>
          </button>
          {inputOpen && (
            <div className="px-3 pb-2">
              <JsonBlock data={msg.tool_input} maxLines={30} />
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {hasResult && (
        <div style={{ borderTop: '1px solid #10b98120' }}>
          <button
            onClick={() => setResultOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
          >
            {resultOpen ? <ChevronDown size={11} style={{ color: '#475569' }} /> : <ChevronRight size={11} style={{ color: '#475569' }} />}
            <span className="text-xs flex items-center gap-1.5" style={{ color: resultMsg?.is_error ? '#f87171' : '#64748b' }}>
              {resultMsg?.is_error ? <AlertCircle size={11} /> : null}
              {resultMsg?.is_error ? 'Error' : 'Output'}
            </span>
          </button>
          {resultOpen && (
            <div className="px-3 pb-2">
              <JsonBlock data={resultMsg?.content ?? ''} maxLines={40} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserTextBlock({ msg }: { msg: ConversationMessage }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#1e293b', border: '1px solid #334155' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>👤 You</span>
        <span className="text-xs" style={{ color: '#374151' }}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#cbd5e1' }}>
        {msg.content}
      </p>
    </div>
  )
}

function AssistantTextBlock({ msg }: { msg: ConversationMessage }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#0f1c0f', border: '1px solid #14532d' }}>
      <div className="flex items-center gap-2 mb-2">
        <Cpu size={12} style={{ color: '#34d399' }} />
        <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Claude</span>
        {msg.model && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#6366f115', color: '#818cf8' }}>
            {fmt.modelName(msg.model)}
          </span>
        )}
        {msg.stop_reason && (
          <span className="text-xs" style={{ color: '#374151' }}>{msg.stop_reason}</span>
        )}
        {msg.usage && (
          <span className="text-xs ml-auto" style={{ color: '#374151' }}>
            in:{fmt.tokens(msg.usage.input)} out:{fmt.tokens(msg.usage.output)}
          </span>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#d1fae5' }}>
        {msg.content}
      </p>
    </div>
  )
}

interface Props {
  sessionId: string
  sessionMeta: { project_name: string; cost: number; last_ts: string | null; messages: number; tool_count: number }
  onClose: () => void
}

export default function SessionDetail({ sessionId, sessionMeta, onClose }: Props) {
  const { data, loading, error } = useSessionDetail(sessionId)
  const [enabledTypes, setEnabledTypes] = useState<Set<MsgType>>(
    new Set(['text', 'thinking', 'tool_use', 'tool_result'])
  )

  const toggleType = (t: MsgType) => {
    setEnabledTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) {
        if (next.size > 1) next.delete(t)
      } else {
        next.add(t)
      }
      return next
    })
  }

  // Build a map from tool_use_id → tool_result message for pairing
  const toolResultMap = new Map<string, ConversationMessage>()
  if (data) {
    for (const m of data.messages) {
      if (m.type === 'tool_result' && m.tool_use_id) {
        toolResultMap.set(m.tool_use_id, m)
      }
    }
  }

  // Filter messages — skip tool_result rows (they're shown inside tool_use)
  const displayMessages = data?.messages.filter(m => {
    if (m.type === 'tool_result') return false
    return enabledTypes.has(m.type)
  }) ?? []

  const typeStats = data
    ? data.messages.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)
    : {}

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#070a0f' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
        style={{ background: '#0f1117', borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200 truncate">{sessionMeta.project_name}</span>
            <span className="text-xs" style={{ color: '#475569' }}>{sessionId.slice(0, 8)}…</span>
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs" style={{ color: '#64748b' }}>
            <span>{fmt.reltime(sessionMeta.last_ts)}</span>
            <span>{sessionMeta.messages} messages</span>
            <span>{sessionMeta.tool_count} tool calls</span>
            <span style={{ color: COLORS.cost }}>{fmt.cost(sessionMeta.cost)}</span>
            {data && (
              <>
                {typeStats.thinking > 0 && <span style={{ color: '#a78bfa' }}>🧠 {typeStats.thinking} thinking</span>}
                {typeStats.tool_use > 0 && <span style={{ color: '#34d399' }}>🔧 {typeStats.tool_use} tool calls</span>}
              </>
            )}
          </div>
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {TYPE_FILTERS.map(({ key, label, icon, color }) => {
            const active = enabledTypes.has(key)
            const count = typeStats[key] ?? 0
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: active ? `${color}20` : '#1a1d27',
                  color: active ? color : '#475569',
                  border: `1px solid ${active ? color + '40' : COLORS.border}`,
                }}
              >
                {icon}
                {label}
                {count > 0 && (
                  <span
                    className="ml-0.5 px-1 rounded text-xs"
                    style={{ background: active ? `${color}30` : '#2a2d3e', color: active ? color : '#475569' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg transition-all flex-shrink-0"
          style={{ color: '#64748b' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e2e8f0')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Loading conversation…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && data && (
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
            {displayMessages.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No messages match the selected filters
              </div>
            )}
            {displayMessages.map((msg, i) => {
              if (msg.type === 'thinking') {
                return <ThinkingBlock key={i} msg={msg} />
              }
              if (msg.type === 'tool_use') {
                const result = msg.tool_id ? toolResultMap.get(msg.tool_id ?? '') : undefined
                const showResult = result && enabledTypes.has('tool_result')
                return <ToolUseBlock key={i} msg={msg} resultMsg={showResult ? result : undefined} />
              }
              if (msg.type === 'text' && msg.role === 'user') {
                return <UserTextBlock key={i} msg={msg} />
              }
              if (msg.type === 'text' && msg.role === 'assistant') {
                return <AssistantTextBlock key={i} msg={msg} />
              }
              return null
            })}
          </div>
        )}
      </div>
    </div>
  )
}
