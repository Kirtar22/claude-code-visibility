import { useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useOverview, useTimeline, useActivity, useLive, useConfig } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { ActivityDay, TimelinePoint } from '../types'
import type { Page } from '../App'

interface Props {
  onLoad: (d: Date) => void
  navigate: (page: Page) => void
}

function StatCard({
  label, value, sub, accent, icon, onClick,
}: {
  label: string; value: string; sub: string; accent: string; icon: string; onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className="rounded-xl p-5 flex flex-col gap-1 text-left w-full transition-all"
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${accent}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={onClick ? e => ((e.currentTarget as HTMLElement).style.borderColor = accent) : undefined}
      onMouseLeave={onClick ? e => ((e.currentTarget as HTMLElement).style.borderColor = COLORS.border) : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</span>
        {onClick && <span className="ml-auto text-xs" style={{ color: accent + '80' }}>→</span>}
      </div>
      <div className="text-2xl font-bold text-slate-100 mt-1">{value}</div>
      <div className="text-xs" style={{ color: '#475569' }}>{sub}</div>
    </Tag>
  )
}

function MiniCard({ label, value, color, onClick }: { label: string; value: string; color: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className="rounded-lg p-4 flex flex-col gap-1 text-left w-full transition-all"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="text-xs" style={{ color: '#64748b' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color }}>{value}</div>
    </Tag>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ background: '#1e2130', border: `1px solid ${COLORS.border}` }}>
      <div className="font-medium text-slate-300 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-slate-400 mb-0.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="text-slate-200 ml-1">{fmt.tokens(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const CostTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ background: '#1e2130', border: `1px solid ${COLORS.border}` }}>
      <div className="font-medium text-slate-300 mb-1">{label}</div>
      <div className="text-amber-400 font-semibold">{fmt.cost(payload[0]?.value ?? 0)}</div>
      <div className="text-slate-500">{payload[0]?.payload?.sessions ?? 0} sessions · {payload[0]?.payload?.tool_calls ?? 0} tools</div>
    </div>
  )
}

function ActivityHeatmap({ data }: { data: ActivityDay[] }) {
  const countMap = new Map(data.map(d => [d.date, d.count]))

  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 16 * 7)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days: { date: string; count: number }[] = []
  const cur = new Date(startDate)
  while (cur <= today) {
    const ds = cur.toISOString().split('T')[0]
    days.push({ date: ds, count: countMap.get(ds) ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }

  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  const cell = (count: number) => {
    if (count === 0) return '#1a1f2e'
    if (count < 10) return '#14532d'
    if (count < 30) return '#166534'
    if (count < 60) return '#15803d'
    return '#22c55e'
  }

  const months = weeks.map((w, i) => {
    const d = new Date(w[0]?.date ?? '')
    return i === 0 || d.getDate() <= 7 ? d.toLocaleDateString('en-US', { month: 'short' }) : ''
  })

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 mb-1">
        {months.map((m, i) => (
          <div key={i} className="w-3 text-center text-xs" style={{ color: '#475569', minWidth: '12px' }}>
            {m}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(day => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} messages`}
                className="rounded-sm cursor-default"
                style={{ width: 12, height: 12, background: cell(day.count) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: '#475569' }}>
        <span>Less</span>
        {[0, 10, 30, 60, 100].map(v => (
          <div key={v} className="rounded-sm" style={{ width: 10, height: 10, background: cell(v) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

export default function Overview({ onLoad, navigate }: Props) {
  const { data: ov, loading: ovL } = useOverview()
  const { data: timeline } = useTimeline()
  const { data: activity } = useActivity()
  const { data: live } = useLive()
  const { data: config } = useConfig()

  useEffect(() => {
    if (ov) onLoad(new Date())
  }, [ov, onLoad])

  if (ovL || !ov) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading metrics…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {ov.first_activity ? `Since ${fmt.shortdate(ov.first_activity)}` : ''} · Last activity {fmt.reltime(ov.last_activity)}
          </p>
        </div>
        {live && live.filter(s => s.is_alive).length > 0 && (
          <button
            onClick={() => navigate('config')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            {live.filter(s => s.is_alive).length} live session{live.filter(s => s.is_alive).length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cost" value={fmt.cost(ov.total_cost)} sub="estimated from token pricing" accent={COLORS.cost} icon="💰" />
        <StatCard label="Sessions" value={fmt.num(ov.total_sessions)} sub={`across ${ov.total_projects} projects`} accent={COLORS.sessions} icon="🗂" onClick={() => navigate('sessions')} />
        <StatCard label="Tool Calls" value={fmt.num(ov.total_tool_calls)} sub={`${ov.unique_tools} unique tools`} accent={COLORS.tools} icon="🔧" onClick={() => navigate('tools')} />
        <StatCard label="Cache Efficiency" value={fmt.pct(ov.cache_efficiency)} sub="tokens served from cache" accent={COLORS.cache} icon="⚡" />
      </div>

      {/* ── ROW 2: Infrastructure tiles (moved up, right after hero) ── */}
      {config && (
        <div className="rounded-xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>Infrastructure</div>
            <button
              onClick={() => navigate('config')}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{ color: '#6366f1' }}
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Global MCP Servers */}
            <button
              onClick={() => navigate('config')}
              className="rounded-lg p-3 text-left transition-all"
              style={{ background: '#13151e', border: '1px solid #f472b620' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#f472b650')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#f472b620')}
            >
              <div className="text-xl font-bold" style={{ color: '#f472b6' }}>{config.global_mcp_servers.length}</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>MCP Servers</div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {(['stdio', 'http', 'docker'] as const).map(t => {
                  const n = config.global_mcp_servers.filter(s => s.transport === t).length
                  if (!n) return null
                  const c = t === 'http' ? '#38bdf8' : t === 'docker' ? '#f472b6' : '#34d399'
                  return <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${c}20`, color: c }}>{t} {n}</span>
                })}
              </div>
              {config.projects.some(p => p.mcp_servers.length > 0) && (
                <div className="text-xs mt-1.5" style={{ color: '#475569' }}>
                  +{config.projects.reduce((n, p) => n + p.mcp_servers.length, 0)} project-specific
                </div>
              )}
            </button>

            {/* Installed plugins */}
            <button
              onClick={() => navigate('config')}
              className="rounded-lg p-3 text-left transition-all"
              style={{ background: '#13151e', border: '1px solid #a78bfa20' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#a78bfa50')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#a78bfa20')}
            >
              <div className="text-xl font-bold" style={{ color: '#a78bfa' }}>{config.installed_plugins.length}</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>Installed Plugins</div>
              <div className="text-xs mt-2 leading-relaxed" style={{ color: '#475569' }}>
                {config.installed_plugins.slice(0, 4).map(p => p.name).join(' · ')}{config.installed_plugins.length > 4 ? ` +${config.installed_plugins.length - 4}` : ''}
              </div>
            </button>

            {/* Skills */}
            <button
              onClick={() => navigate('config')}
              className="rounded-lg p-3 text-left transition-all"
              style={{ background: '#13151e', border: '1px solid #f59e0b20' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#f59e0b50')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#f59e0b20')}
            >
              <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{config.skill_usage.length}</div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>Skills</div>
              <div className="mt-2 space-y-0.5">
                {config.skill_usage.map(s => (
                  <div key={s.name} className="flex justify-between text-xs">
                    <span className="truncate" style={{ color: '#475569' }}>{s.name}</span>
                    <span style={{ color: '#f59e0b' }}>{s.usage_count}×</span>
                  </div>
                ))}
              </div>
            </button>

            {/* Live sessions */}
            <button
              onClick={() => navigate('config')}
              className="rounded-lg p-3 text-left transition-all"
              style={{ background: '#13151e', border: `1px solid ${(live?.filter(s => s.is_alive).length ?? 0) > 0 ? '#10b98130' : '#1e293b'}` }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#10b98150')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = (live?.filter(s => s.is_alive).length ?? 0) > 0 ? '#10b98130' : '#1e293b')}
            >
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold" style={{ color: '#10b981' }}>{live?.filter(s => s.is_alive).length ?? 0}</div>
                {(live?.filter(s => s.is_alive).length ?? 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>Live Sessions</div>
              {live?.filter(s => s.is_alive).map(s => (
                <div key={s.pid} className="text-xs mt-1.5 truncate" style={{ color: '#475569' }}>
                  {s.cwd.replace(/^\/Users\/[^/]+/, '~')}
                  <span className="ml-1" style={{ color: s.status === 'waiting' ? '#f59e0b' : '#10b981' }}>{s.status}</span>
                </div>
              ))}
            </button>
          </div>
        </div>
      )}

      {/* Token mini cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard label="Input Tokens" value={fmt.tokens(ov.total_tokens_in)} color={COLORS.input} />
        <MiniCard label="Output Tokens" value={fmt.tokens(ov.total_tokens_out)} color={COLORS.output} />
        <MiniCard label="Cache Read" value={fmt.tokens(ov.total_cache_read)} color={COLORS.cacheRead} onClick={() => navigate('models')} />
        <MiniCard label="Cache Creation" value={fmt.tokens(ov.total_cache_creation)} color={COLORS.cacheCreate} onClick={() => navigate('models')} />
      </div>

      {/* ── ROW 3: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-medium text-slate-300 mb-4">Daily Cost</div>
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cost} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.cost} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CostTooltip />} />
                <Area type="monotone" dataKey="cost" stroke={COLORS.cost} strokeWidth={2} fill="url(#costGrad)" name="Cost" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: '#475569' }}>No data yet</div>
          )}
        </div>

        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-medium text-slate-300 mb-4">Daily Tokens</div>
          {timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.input} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.input} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.output} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.output} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cacheGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cacheRead} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.cacheRead} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => fmt.tokens(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cache_read" stroke={COLORS.cacheRead} strokeWidth={1.5} fill="url(#cacheGrad)" name="Cache Read" />
                <Area type="monotone" dataKey="tokens_out" stroke={COLORS.output} strokeWidth={1.5} fill="url(#outGrad)" name="Output" />
                <Area type="monotone" dataKey="tokens_in" stroke={COLORS.input} strokeWidth={1.5} fill="url(#inGrad)" name="Input" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: '#475569' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── ROW 4: Activity heatmap (left, compact) + Architecture Insights (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Heatmap — narrower, less dominant */}
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="text-sm font-medium text-slate-300 mb-3">Activity</div>
          {activity ? (
            <ActivityHeatmap data={activity} />
          ) : (
            <div className="text-sm" style={{ color: '#475569' }}>Loading…</div>
          )}
          {/* Quick stats under heatmap */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            {[
              { label: 'Messages', value: fmt.num(ov.total_messages) },
              { label: 'Avg Cost', value: fmt.cost(ov.total_cost / Math.max(ov.total_sessions, 1)) },
              { label: 'Cache Hit%', value: fmt.pct(ov.cache_efficiency) },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-sm font-bold text-slate-200">{item.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Insights — right side */}
        <div className="lg:col-span-3 rounded-xl p-5 space-y-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">Architecture Insights</div>
            <div className="text-xs" style={{ color: '#475569' }}>how Claude works across sessions</div>
          </div>

          {/* Count row */}
          {(() => {
            const stopReasons = ov.stop_reasons ?? {}
            const toolUseCount = (stopReasons as Record<string, number>)['tool_use'] ?? 0
            const endTurnCount = (stopReasons as Record<string, number>)['end_turn'] ?? 0
            const agenticRatio = endTurnCount > 0 ? (toolUseCount / endTurnCount).toFixed(1) : null
            return (
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Thinking', value: fmt.num(ov.total_thinking_blocks), color: '#a78bfa', tip: 'Extended thinking blocks — complex multi-step reasoning' },
                  { label: 'Web Searches', value: fmt.num(ov.total_web_searches), color: '#38bdf8', tip: 'Live web searches across all sessions' },
                  { label: 'Web Fetches', value: fmt.num(ov.total_web_fetches), color: '#fb923c', tip: 'URL fetches (docs, APIs, pages)' },
                  { label: 'File Edits', value: fmt.num(ov.total_file_edits), color: '#34d399', tip: 'Files modified via Edit/Write tools' },
                  { label: 'Agentic Ratio', value: agenticRatio ? `${agenticRatio}:1` : '—', color: '#10b981', tip: `tool_use:end_turn — ${agenticRatio}× more autonomous work than Q&A turns. Higher = more agentic.` },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-2.5 text-center" style={{ background: '#13151e' }} title={item.tip}>
                    <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-xs mt-0.5 leading-tight" style={{ color: '#475569' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Distribution bars — 3 columns */}
          <div className="grid grid-cols-3 gap-4">
            {/* Stop Reasons */}
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: '#64748b' }}>
                Stop Reasons
                <span className="ml-1 font-normal" style={{ color: '#374151' }}>— why Claude paused</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(ov.stop_reasons ?? {}).sort(([, a], [, b]) => b - a).map(([reason, count]) => {
                  const total = Object.values(ov.stop_reasons ?? {}).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? count / total : 0
                  const color = reason === 'tool_use' ? '#10b981' : reason === 'end_turn' ? '#60a5fa' : '#f59e0b'
                  return (
                    <div key={reason}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span style={{ color: '#94a3b8' }}>{reason}</span>
                        <span style={{ color: '#475569' }}>{Math.round(pct * 100)}%</span>
                      </div>
                      <div className="rounded-full h-1" style={{ background: '#1e293b' }}>
                        <div className="rounded-full h-1 transition-all" style={{ width: `${pct * 100}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Entrypoints */}
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: '#64748b' }}>
                Entrypoints
                <span className="ml-1 font-normal" style={{ color: '#374151' }}>— how launched</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(ov.entrypoints ?? {}).sort(([, a], [, b]) => b - a).slice(0, 5).map(([ep, count]) => {
                  const total = Object.values(ov.entrypoints ?? {}).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? count / total : 0
                  return (
                    <div key={ep}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate" style={{ color: '#94a3b8' }}>{ep || 'unknown'}</span>
                        <span style={{ color: '#475569' }}>{count}</span>
                      </div>
                      <div className="rounded-full h-1" style={{ background: '#1e293b' }}>
                        <div className="rounded-full h-1" style={{ width: `${pct * 100}%`, background: '#6366f1' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Versions */}
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: '#64748b' }}>
                Versions
                <span className="ml-1 font-normal" style={{ color: '#374151' }}>— Claude Code</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(ov.versions ?? {}).sort(([, a], [, b]) => b - a).slice(0, 5).map(([ver, count]) => {
                  const total = Object.values(ov.versions ?? {}).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? count / total : 0
                  return (
                    <div key={ver}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span style={{ color: '#94a3b8' }}>{ver}</span>
                        <span style={{ color: '#475569' }}>{count}</span>
                      </div>
                      <div className="rounded-full h-1" style={{ background: '#1e293b' }}>
                        <div className="rounded-full h-1" style={{ width: `${pct * 100}%`, background: '#f59e0b' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
