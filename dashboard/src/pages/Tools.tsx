import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTools } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { Tool } from '../types'

type Filter = 'all' | 'builtin' | 'mcp'

function FilterTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-sm transition-all"
      style={{
        background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
        color: active ? '#10b981' : '#64748b',
        border: `1px solid ${active ? '#10b981' : COLORS.border}`,
      }}
    >
      {label}
    </button>
  )
}

const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Tool
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ background: '#1e2130', border: `1px solid ${COLORS.border}` }}>
      <div className="font-medium text-slate-300 mb-1">{d.display_name}</div>
      <div className="text-slate-400">
        Calls: <span className="text-slate-200">{fmt.num(d.count)}</span>
      </div>
      <div className="text-slate-400 mt-0.5">
        Type: <span style={{ color: d.category === 'mcp' ? COLORS.mcp : COLORS.builtin }}>{d.category}</span>
      </div>
    </div>
  )
}

export default function Tools() {
  const { data, loading, error } = useTools()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading tools…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data) return null

  const filtered = data.tools.filter(t =>
    filter === 'all' ? true : t.category === filter
  )
  const display = showAll ? filtered : filtered.slice(0, 20)
  const maxCount = Math.max(...filtered.map(t => t.count), 1)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Tools</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          {data.total_unique} unique tools · {fmt.num(data.total_calls)} total calls
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Total Calls</div>
          <div className="text-xl font-bold" style={{ color: COLORS.tools }}>{fmt.num(data.total_calls)}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Unique Tools</div>
          <div className="text-xl font-bold text-slate-200">{data.total_unique}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>Built-in Calls</div>
          <div className="text-xl font-bold" style={{ color: COLORS.builtin }}>{fmt.num(data.builtin_calls)}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-xs" style={{ color: '#64748b' }}>MCP Calls</div>
          <div className="text-xl font-bold" style={{ color: COLORS.mcp }}>{fmt.num(data.mcp_calls)}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <FilterTab active={filter === 'all'} label={`All (${data.tools.length})`} onClick={() => setFilter('all')} />
        <FilterTab active={filter === 'builtin'} label={`Built-in (${data.tools.filter(t => t.category === 'builtin').length})`} onClick={() => setFilter('builtin')} />
        <FilterTab active={filter === 'mcp'} label={`MCP (${data.tools.filter(t => t.category === 'mcp').length})`} onClick={() => setFilter('mcp')} />
      </div>

      {/* Bar chart */}
      <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="text-sm font-medium text-slate-300 mb-4">Call Count by Tool</div>
        <ResponsiveContainer width="100%" height={Math.max(filtered.slice(0, 20).length * 28, 200)}>
          <BarChart data={display} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="display_name"
              type="category"
              width={160}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {display.map(t => (
                <Cell key={t.name} fill={t.category === 'mcp' ? COLORS.mcp : COLORS.tools} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List view with bars */}
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Tool</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Calls</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {display.map((t, i) => (
              <tr
                key={t.name}
                style={{
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-slate-200">{t.display_name}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: t.category === 'mcp' ? `${COLORS.mcp}20` : `${COLORS.builtin}20`,
                      color: t.category === 'mcp' ? COLORS.mcp : COLORS.builtin,
                    }}
                  >
                    {t.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-200">{fmt.num(t.count)}</td>
                <td className="px-4 py-2.5 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: '#2a2d3e' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(t.count / maxCount) * 100}%`,
                          background: t.category === 'mcp' ? COLORS.mcp : COLORS.tools,
                        }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: '#64748b' }}>
                      {fmt.pct((t.count / data.total_calls) * 100)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 20 && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <button
              onClick={() => setShowAll(v => !v)}
              className="text-xs"
              style={{ color: '#10b981' }}
            >
              {showAll ? 'Show less' : `Show all ${filtered.length} tools`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
