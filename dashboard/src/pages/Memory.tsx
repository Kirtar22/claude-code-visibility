import { useState } from 'react'
import { useMemory } from '../hooks/useData'
import { COLORS } from '../utils'
import type { MemoryFile } from '../types'

type TypeFilter = 'all' | 'user' | 'feedback' | 'project' | 'reference' | 'unknown'

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  user:      { bg: '#3b82f620', text: '#60a5fa', label: '👤 User' },
  feedback:  { bg: '#f59e0b20', text: '#fbbf24', label: '📝 Feedback' },
  project:   { bg: '#10b98120', text: '#34d399', label: '🗂 Project' },
  reference: { bg: '#8b5cf620', text: '#a78bfa', label: '🔗 Reference' },
  unknown:   { bg: '#64748b20', text: '#94a3b8', label: '❓ Unknown' },
}

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS.unknown
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  )
}

function MemoryCard({ m, expanded, onToggle }: { m: MemoryFile; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: COLORS.card,
        border: `1px solid ${expanded ? '#10b981' : COLORS.border}`,
      }}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <TypeBadge type={m.type} />
              <span className="text-xs" style={{ color: '#475569' }}>{m.project_dir}</span>
            </div>
            <div className="font-medium text-slate-200 mt-1.5 text-sm">{m.name}</div>
            {m.description && (
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{m.description}</div>
            )}
          </div>
          <div className="text-xs flex-shrink-0" style={{ color: '#374151' }}>
            {new Date(m.modified * 1000).toLocaleDateString()}
          </div>
        </div>

        {expanded && m.content && (
          <div
            className="mt-4 p-3 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap"
            style={{ background: '#0f1117', color: '#94a3b8', border: `1px solid ${COLORS.border}` }}
          >
            {m.content}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Memory() {
  const { data, loading, error } = useMemory()
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading memory…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data) return null

  const types = ['user', 'feedback', 'project', 'reference', 'unknown'] as TypeFilter[]
  const counts: Record<string, number> = {}
  for (const m of data) {
    counts[m.type] = (counts[m.type] ?? 0) + 1
  }

  const filtered = data.filter(m => {
    if (filter !== 'all' && m.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Memory</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{data.length} memory entries across all projects</p>
      </div>

      {/* Type distribution */}
      <div className="grid grid-cols-5 gap-3">
        {types.map(t => {
          const c = TYPE_COLORS[t] ?? TYPE_COLORS.unknown
          const cnt = counts[t] ?? 0
          return (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? 'all' : t)}
              className="rounded-lg p-3 text-left transition-all"
              style={{
                background: filter === t ? c.bg : COLORS.card,
                border: `1px solid ${filter === t ? c.text : COLORS.border}`,
              }}
            >
              <div className="text-xs" style={{ color: c.text }}>{c.label}</div>
              <div className="text-xl font-bold text-slate-200 mt-1">{cnt}</div>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search memories…"
        className="w-full px-4 py-2 rounded-lg text-sm outline-none"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: '#e2e8f0' }}
      />

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(m => {
          const key = `${m.project_dir}/${m.file}`
          return (
            <MemoryCard
              key={key}
              m={m}
              expanded={expanded === key}
              onToggle={() => setExpanded(expanded === key ? null : key)}
            />
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">No memory entries found</div>
        )}
      </div>
    </div>
  )
}
