import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useModels } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { ModelStats } from '../types'

const MODEL_COLORS: Record<string, string> = {
  Sonnet: '#10b981',
  Haiku:  '#3b82f6',
  Opus:   '#8b5cf6',
  Unknown: '#64748b',
}

function modelColor(name: string): string {
  if (name.includes('sonnet')) return MODEL_COLORS.Sonnet
  if (name.includes('haiku')) return MODEL_COLORS.Haiku
  if (name.includes('opus')) return MODEL_COLORS.Opus
  return MODEL_COLORS.Unknown
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ background: '#1e2130', border: `1px solid ${COLORS.border}` }}>
      <div className="font-medium text-slate-300 mb-1">{d.name}</div>
      <div className="text-slate-400">Sessions: <span className="text-slate-200">{fmt.num(d.value)}</span></div>
      <div className="text-slate-400">Cost: <span style={{ color: COLORS.cost }}>{fmt.cost(d.payload.cost)}</span></div>
    </div>
  )
}

export default function Models() {
  const { data, loading, error } = useModels()

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading models…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!data) return null

  const entries = Object.entries(data) as [string, ModelStats][]
  const totalSessions = entries.reduce((a, [, v]) => a + v.sessions, 0)
  const totalCost = entries.reduce((a, [, v]) => a + v.cost, 0)

  const pieData = entries.map(([name, stats]) => ({
    name: fmt.modelName(name),
    fullName: name,
    value: stats.sessions,
    cost: stats.cost,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Models</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{entries.length} models used across all sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-medium text-slate-300 mb-2">Session Distribution</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map(entry => (
                  <Cell key={entry.fullName} fill={modelColor(entry.fullName)} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost pie */}
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-medium text-slate-300 mb-2">Cost Distribution</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="cost"
              >
                {pieData.map(entry => (
                  <Cell key={entry.fullName} fill={modelColor(entry.fullName)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [fmt.cost(v), 'Cost']}
                contentStyle={{ background: '#1e2130', border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats table */}
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {['Model', 'Sessions', 'Input Tokens', 'Output Tokens', 'Cache Read', 'Tool Calls', 'Cost', '% Cost'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.sort((a, b) => b[1].cost - a[1].cost).map(([name, stats], i) => (
              <tr
                key={name}
                style={{
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: modelColor(name) }} />
                    <span className="text-slate-200 font-medium">{fmt.modelName(name)}</span>
                    <span className="text-xs" style={{ color: '#475569' }}>{name.length > 20 ? name.slice(0, 20) + '…' : name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">{fmt.num(stats.sessions)}</td>
                <td className="px-4 py-3" style={{ color: COLORS.input }}>{fmt.tokens(stats.tokens_in)}</td>
                <td className="px-4 py-3" style={{ color: COLORS.output }}>{fmt.tokens(stats.tokens_out)}</td>
                <td className="px-4 py-3" style={{ color: COLORS.cacheRead }}>{fmt.tokens(stats.cache_read)}</td>
                <td className="px-4 py-3 text-slate-300">{fmt.num(stats.tool_calls)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: COLORS.cost }}>{fmt.cost(stats.cost)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full" style={{ background: '#2a2d3e' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(stats.cost / Math.max(totalCost, 0.001)) * 100}%`, background: modelColor(name) }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      {fmt.pct((stats.cost / Math.max(totalCost, 0.001)) * 100)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `1px solid ${COLORS.border}`, background: '#13151e' }}>
              <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#94a3b8' }}>Total</td>
              <td className="px-4 py-3 text-xs text-slate-200">{fmt.num(totalSessions)}</td>
              <td className="px-4 py-3 text-xs" style={{ color: COLORS.input }}>
                {fmt.tokens(entries.reduce((a, [, v]) => a + v.tokens_in, 0))}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: COLORS.output }}>
                {fmt.tokens(entries.reduce((a, [, v]) => a + v.tokens_out, 0))}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: COLORS.cacheRead }}>
                {fmt.tokens(entries.reduce((a, [, v]) => a + v.cache_read, 0))}
              </td>
              <td className="px-4 py-3 text-xs text-slate-200">
                {fmt.num(entries.reduce((a, [, v]) => a + v.tool_calls, 0))}
              </td>
              <td className="px-4 py-3 text-xs font-bold" style={{ color: COLORS.cost }}>{fmt.cost(totalCost)}</td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pricing reference */}
      <div className="rounded-xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="text-xs font-medium text-slate-400 mb-3">Pricing Reference (per 1M tokens)</div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { model: 'Sonnet 4.6', input: '$3.00', output: '$15.00', cacheW: '$3.75', cacheR: '$0.30', color: MODEL_COLORS.Sonnet },
            { model: 'Haiku 4.5', input: '$0.80', output: '$4.00', cacheW: '$1.00', cacheR: '$0.08', color: MODEL_COLORS.Haiku },
            { model: 'Opus 4.x',  input: '$15.00', output: '$75.00', cacheW: '$18.75', cacheR: '$1.50', color: MODEL_COLORS.Opus },
          ].map(p => (
            <div key={p.model} className="rounded-lg p-3" style={{ background: '#0f1117', border: `1px solid ${p.color}30` }}>
              <div className="font-semibold mb-2" style={{ color: p.color }}>{p.model}</div>
              {[
                ['Input', p.input],
                ['Output', p.output],
                ['Cache Write', p.cacheW],
                ['Cache Read', p.cacheR],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between" style={{ color: '#64748b' }}>
                  <span>{label}</span>
                  <span style={{ color: '#94a3b8' }}>{val}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
