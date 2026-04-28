import { useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { useSessions } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { Session } from '../types'

type SortOpt = 'recent' | 'cost' | 'messages' | 'tools'

type DetailMeta = { project_name: string; cost: number; last_ts: string | null; messages: number; tool_count: number }

function getSnippet(fullText: string, query: string): string {
  const lower = fullText.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return ''
  const start = Math.max(0, idx - 60)
  const end = Math.min(fullText.length, idx + query.length + 80)
  return (start > 0 ? '…' : '') + fullText.slice(start, end) + (end < fullText.length ? '…' : '')
}

function SessionCard({
  s, expanded, onToggle, searchQuery, onOpenDetail,
}: {
  s: Session
  expanded: boolean
  onToggle: () => void
  searchQuery: string
  onOpenDetail: (id: string, meta: DetailMeta) => void
}) {
  const duration = s.first_ts && s.last_ts
    ? Math.round((new Date(s.last_ts).getTime() - new Date(s.first_ts).getTime()) / 60_000)
    : null

  const snippet = searchQuery && s.full_text ? getSnippet(s.full_text, searchQuery) : null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: COLORS.card,
        border: `1px solid ${expanded ? '#10b981' : COLORS.border}`,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 cursor-pointer flex items-start gap-4"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200 truncate">{s.project_name}</span>
            {s.slug && (
              <span className="text-xs font-mono" style={{ color: '#475569' }}>{s.slug}</span>
            )}
            {s.models.map(m => (
              <span
                key={m}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: '#6366f120', color: '#818cf8' }}
              >
                {fmt.modelName(m)}
              </span>
            ))}
            {s.git_branch && s.git_branch !== 'HEAD' && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1e293b', color: '#64748b' }}>
                {s.git_branch}
              </span>
            )}
            {s.compact_count > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#a78bfa20', color: '#a78bfa' }} title="Context compacted">
                ⚡ {s.compact_count}×
              </span>
            )}
            {s.subagent_count > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#34d39920', color: '#34d399' }} title="Subagents spawned">
                🤖 {s.subagent_count}
              </span>
            )}
            {s.api_errors > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#f8717120', color: '#f87171' }} title="API errors during session">
                ⚠ {s.api_errors}
              </span>
            )}
          </div>

          {/* Search snippet or last prompt */}
          {snippet ? (
            <div className="mt-1.5 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
              {snippet}
            </div>
          ) : s.last_prompt ? (
            <div className="mt-1.5 text-xs line-clamp-1" style={{ color: '#94a3b8' }}>
              "{s.last_prompt.slice(0, 120)}{s.last_prompt.length > 120 ? '…' : ''}"
            </div>
          ) : null}

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#64748b' }}>
            <span>{fmt.reltime(s.last_ts)}</span>
            {duration !== null && <span>{duration}m</span>}
            <span>{s.messages} msgs</span>
            <span>{s.tool_count} tools</span>
          </div>
        </div>

        {/* Cost + view + expand */}
        <div className="flex items-start gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="font-bold" style={{ color: COLORS.cost }}>{fmt.cost(s.cost)}</div>
            <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              {fmt.tokens(s.tokens_in + s.tokens_out)} tok
            </div>
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              onOpenDetail(s.id, { project_name: s.project_name, cost: s.cost, last_ts: s.last_ts, messages: s.messages, tool_count: s.tool_count })
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98130', marginTop: 1 }}
            title="View full conversation"
          >
            <MessageSquare size={11} />
            View
          </button>
          {expanded
            ? <ChevronDown size={16} style={{ color: '#10b981', marginTop: 2 }} />
            : <ChevronRight size={16} style={{ color: '#475569', marginTop: 2 }} />
          }
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 space-y-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>

          {/* Session identity strip */}
          <div className="rounded-lg px-4 py-3 mt-4 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ background: '#13151e' }}>
            {s.slug && (
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Slug</div>
                <div className="text-sm font-mono font-semibold text-slate-200">{s.slug}</div>
              </div>
            )}
            <div>
              <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Session ID</div>
              <div className="text-xs font-mono" style={{ color: '#64748b' }}>{s.id}</div>
            </div>
            {s.permission_modes.length > 0 && (
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#475569' }}>Permission Modes</div>
                <div className="flex gap-1">
                  {s.permission_modes.map(m => (
                    <span key={m} className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{ background: m === 'auto' ? '#10b98120' : m === 'plan' ? '#6366f120' : '#1e293b', color: m === 'auto' ? '#10b981' : m === 'plan' ? '#818cf8' : '#64748b' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Intelligence metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Compactions', value: s.compact_count > 0 ? `${s.compact_count}×` : '—', color: s.compact_count > 0 ? '#a78bfa' : '#374151', title: 'Context auto-compacted when window filled' },
              { label: 'Subagents', value: s.subagent_count > 0 ? s.subagent_count.toString() : '—', color: s.subagent_count > 0 ? '#34d399' : '#374151', title: 'Agent tool spawns' },
              { label: 'API Errors', value: s.api_errors > 0 ? s.api_errors.toString() : '—', color: s.api_errors > 0 ? '#f87171' : '#374151', title: 'Connection/API failures during session' },
              { label: 'Turn Time', value: s.total_turn_ms > 0 ? `${Math.round(s.total_turn_ms / 60000)}m` : '—', color: '#60a5fa', title: 'Total model processing time' },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: '#13151e' }} title={item.title}>
                <div className="text-xs mb-1" style={{ color: '#475569' }}>{item.label}</div>
                <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Token breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Input Tokens', value: fmt.tokens(s.tokens_in), color: COLORS.input },
              { label: 'Output Tokens', value: fmt.tokens(s.tokens_out), color: COLORS.output },
              { label: 'Cache Read', value: fmt.tokens(s.cache_read), color: COLORS.cacheRead },
              { label: 'Thinking Blocks', value: s.thinking_blocks > 0 ? s.thinking_blocks.toString() : '—', color: '#a78bfa' },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: '#13151e' }}>
                <div className="text-xs mb-1" style={{ color: '#475569' }}>{item.label}</div>
                <div className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Top tools */}
          {s.top_tools.length > 0 && (
            <div>
              <div className="text-xs mb-2" style={{ color: '#64748b' }}>Top tools used</div>
              <div className="flex flex-wrap gap-2">
                {s.top_tools.map(([name, count]) => {
                  const isMcp = name.startsWith('mcp__')
                  const display = isMcp ? name.split('__').slice(1, 3).join('/') : name
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                      style={{
                        background: isMcp ? `${COLORS.mcp}15` : `${COLORS.tools}15`,
                        color: isMcp ? COLORS.mcp : COLORS.tools,
                        border: `1px solid ${isMcp ? COLORS.mcp : COLORS.tools}30`,
                      }}
                    >
                      <span className="font-mono">{display}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Session meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {s.version && (
              <div><span style={{ color: '#475569' }}>Version: </span><span style={{ color: '#94a3b8' }}>{s.version}</span></div>
            )}
            {s.entrypoint && (
              <div><span style={{ color: '#475569' }}>Entrypoint: </span><span style={{ color: '#94a3b8' }}>{s.entrypoint}</span></div>
            )}
            {s.git_branch && s.git_branch !== 'HEAD' && (
              <div><span style={{ color: '#475569' }}>Branch: </span><span style={{ color: '#94a3b8' }}>{s.git_branch}</span></div>
            )}
            {s.first_ts && (
              <div><span style={{ color: '#475569' }}>Started: </span><span style={{ color: '#94a3b8' }}>{new Date(s.first_ts).toLocaleString()}</span></div>
            )}
            {s.web_searches > 0 && (
              <div><span style={{ color: '#475569' }}>Web searches: </span><span style={{ color: '#38bdf8' }}>{s.web_searches}</span></div>
            )}
            {s.web_fetches > 0 && (
              <div><span style={{ color: '#475569' }}>Web fetches: </span><span style={{ color: '#fb923c' }}>{s.web_fetches}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Sessions({ onOpenDetail }: { onOpenDetail: (id: string, meta: DetailMeta) => void }) {
  const { data, loading, error } = useSessions()
  const [sort, setSort] = useState<SortOpt>('recent')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading sessions…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data) return null

  let filtered = data.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.project_name.toLowerCase().includes(q) ||
      (s.last_prompt?.toLowerCase().includes(q) ?? false) ||
      (s.full_text?.toLowerCase().includes(q) ?? false)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'recent') return (b.last_ts ?? '') > (a.last_ts ?? '') ? 1 : -1
    if (sort === 'cost') return b.cost - a.cost
    if (sort === 'messages') return b.messages - a.messages
    if (sort === 'tools') return b.tool_count - a.tool_count
    return 0
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Sessions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{data.length} total sessions</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search full conversation history…"
          className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            color: '#e2e8f0',
          }}
        />
        <div className="flex gap-2">
          {(['recent', 'cost', 'messages', 'tools'] as SortOpt[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="px-3 py-2 rounded-lg text-xs transition-all capitalize"
              style={{
                background: sort === s ? 'rgba(16,185,129,0.15)' : COLORS.card,
                color: sort === s ? '#10b981' : '#64748b',
                border: `1px solid ${sort === s ? '#10b981' : COLORS.border}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Session cards */}
      <div className="space-y-3">
        {sorted.map(s => (
          <SessionCard
            key={s.id}
            s={s}
            expanded={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
            searchQuery={search}
            onOpenDetail={onOpenDetail}
          />
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-500">No sessions match your search</div>
        )}
      </div>
    </div>
  )
}
