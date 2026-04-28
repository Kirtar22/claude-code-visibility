import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useProjects } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { Project } from '../types'

type SortKey = keyof Pick<Project, 'cost' | 'sessions' | 'messages' | 'tool_calls' | 'cache_efficiency' | 'last_ts'>

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: `${color}20`, color }}>
      {text}
    </span>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#2a2d3e' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-10 text-right" style={{ color: '#94a3b8' }}>{fmt.pct(value)}</span>
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown size={12} style={{ color: '#374151' }} />
  return dir === 'desc'
    ? <ChevronDown size={12} style={{ color: '#10b981' }} />
    : <ChevronUp size={12} style={{ color: '#10b981' }} />
}

export default function Projects() {
  const { data, loading, error } = useProjects()
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading projects…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data) return null

  const maxCost = Math.max(...data.map(p => p.cost), 1)

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'desc' ? -cmp : cmp
  })

  const TH = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-left text-xs font-medium cursor-pointer select-none whitespace-nowrap"
      style={{ color: sortKey === k ? '#10b981' : '#64748b' }}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon active={sortKey === k} dir={sortDir} />
      </div>
    </th>
  )

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{data.length} projects tracked</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Top project by cost</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 truncate">{data[0]?.project_name ?? '—'}</div>
          <div className="text-lg font-bold" style={{ color: COLORS.cost }}>{fmt.cost(data[0]?.cost ?? 0)}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Most active (sessions)</div>
          {(() => {
            const top = [...data].sort((a, b) => b.sessions - a.sessions)[0]
            return (
              <>
                <div className="text-sm font-semibold text-slate-200 mt-1 truncate">{top?.project_name ?? '—'}</div>
                <div className="text-lg font-bold" style={{ color: COLORS.sessions }}>{top?.sessions ?? 0} sessions</div>
              </>
            )
          })()}
        </div>
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Most tool calls</div>
          {(() => {
            const top = [...data].sort((a, b) => b.tool_calls - a.tool_calls)[0]
            return (
              <>
                <div className="text-sm font-semibold text-slate-200 mt-1 truncate">{top?.project_name ?? '—'}</div>
                <div className="text-lg font-bold" style={{ color: COLORS.tools }}>{fmt.num(top?.tool_calls ?? 0)} calls</div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Project</th>
                <TH label="Sessions" k="sessions" />
                <TH label="Messages" k="messages" />
                <TH label="Tools" k="tool_calls" />
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Tokens In/Out</th>
                <TH label="Cache Hit%" k="cache_efficiency" />
                <TH label="Cost" k="cost" />
                <TH label="Last Active" k="last_ts" />
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Mem</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const isExpanded = expanded === p.project_dir
                return (
                  <>
                    <tr
                      key={p.project_dir}
                      onClick={() => setExpanded(isExpanded ? null : p.project_dir)}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: isExpanded ? 'rgba(16,185,129,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                      onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200 truncate max-w-xs" title={p.project_name}>{p.project_name}</div>
                        <div className="text-xs mt-0.5 flex gap-1 flex-wrap">
                          {p.models.map(m => <Badge key={m} text={fmt.modelName(m)} color="#6366f1" />)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.sessions}</td>
                      <td className="px-4 py-3 text-slate-300">{fmt.num(p.messages)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmt.num(p.tool_calls)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-300">{fmt.tokens(p.tokens_in)}</div>
                        <div className="text-xs" style={{ color: '#64748b' }}>{fmt.tokens(p.tokens_out)} out</div>
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <ProgressBar value={p.cache_efficiency} max={100} color={COLORS.cacheRead} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: COLORS.cost }}>{fmt.cost(p.cost)}</div>
                        <div className="w-24 h-1 rounded-full mt-1" style={{ background: '#2a2d3e' }}>
                          <div className="h-full rounded-full" style={{ width: `${(p.cost / maxCost) * 100}%`, background: COLORS.cost }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{fmt.reltime(p.last_ts)}</td>
                      <td className="px-4 py-3">
                        {p.memory_count > 0 ? (
                          <Badge text={`${p.memory_count}`} color={COLORS.cache} />
                        ) : (
                          <span className="text-xs" style={{ color: '#374151' }}>—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.project_dir}-exp`} style={{ background: 'rgba(16,185,129,0.03)', borderBottom: `1px solid ${COLORS.border}` }}>
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                              <div style={{ color: '#64748b' }}>Cache Read</div>
                              <div className="text-slate-200 font-medium">{fmt.tokens(p.cache_read)}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Cache Creation</div>
                              <div className="text-slate-200 font-medium">{fmt.tokens(p.cache_creation)}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>First Activity</div>
                              <div className="text-slate-200 font-medium">{fmt.shortdate(p.first_ts)}</div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b' }}>Avg Cost/Session</div>
                              <div className="text-slate-200 font-medium">{fmt.cost(p.cost / Math.max(p.sessions, 1))}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
