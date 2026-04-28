import { useState } from 'react'
import { Server, Shield, Puzzle, Zap, Globe, Terminal, ChevronDown, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import { useConfig, useLive } from '../hooks/useData'
import { fmt, COLORS } from '../utils'
import type { McpServer, ProjectConfig } from '../types'

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: `${color}20`, color }}>
      {label}
    </span>
  )
}

function McpServerRow({ s }: { s: McpServer }) {
  const transportColor = s.transport === 'http' ? '#38bdf8' : s.transport === 'docker' ? '#f472b6' : '#34d399'
  const shortCmd = s.command.length > 40 ? '…' + s.command.slice(-38) : s.command
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: COLORS.border }}>
      <Terminal size={13} style={{ color: '#34d399', marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-200">{s.name}</span>
          <Badge label={s.transport} color={transportColor} />
          {s.scope === 'project' && <Badge label="project" color="#f59e0b" />}
        </div>
        <div className="text-xs mt-0.5 font-mono truncate" style={{ color: '#64748b' }}>{shortCmd} {s.args.join(' ')}</div>
      </div>
    </div>
  )
}

function ProjectRow({ p }: { p: ProjectConfig }) {
  const [open, setOpen] = useState(false)
  const hasTools = p.allowed_tools.length > 0
  const hasMcp = p.mcp_servers.length > 0
  if (!hasTools && !hasMcp && !p.last_cost) return null

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#13151e', border: `1px solid ${COLORS.border}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {open ? <ChevronDown size={13} style={{ color: '#475569' }} /> : <ChevronRight size={13} style={{ color: '#475569' }} />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">{p.path}</div>
          <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: '#64748b' }}>
            {hasTools && <span style={{ color: '#10b981' }}>{p.allowed_tools.length} allowed tools</span>}
            {hasMcp && <span style={{ color: '#f472b6' }}>{p.mcp_servers.length} MCP servers</span>}
            {p.last_cost != null && p.last_cost > 0 && <span style={{ color: COLORS.cost }}>{fmt.cost(p.last_cost)} last session</span>}
            {p.last_lines_added != null && <span>+{p.last_lines_added} lines</span>}
            {p.last_lines_removed != null && <span>-{p.last_lines_removed} lines</span>}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {hasTools && (
            <div className="pt-3">
              <div className="text-xs mb-2" style={{ color: '#64748b' }}>Allowed Tools (Always Allow)</div>
              <div className="flex flex-wrap gap-1.5">
                {p.allowed_tools.map(t => (
                  <div key={t} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                    style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                    <CheckCircle size={10} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasMcp && (
            <div className="pt-2">
              <div className="text-xs mb-2" style={{ color: '#64748b' }}>Project MCP Servers</div>
              {p.mcp_servers.map(s => <McpServerRow key={s.name} s={s} />)}
            </div>
          )}
          {p.last_api_duration_ms != null && (
            <div className="text-xs" style={{ color: '#475569' }}>
              Last API call: {Math.round(p.last_api_duration_ms)}ms
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Config() {
  const { data: config, loading: cfgL, error: cfgE } = useConfig()
  const { data: live } = useLive()

  if (cfgL) return <div className="flex items-center justify-center h-64 text-slate-500">Loading config…</div>
  if (cfgE) return <div className="flex items-center justify-center h-64 text-red-400">{cfgE}</div>
  if (!config) return null

  const gs = config.global_settings
  const aliveSessions = live?.filter(s => s.is_alive) ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Configuration</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Claude Code settings, MCP servers, tool permissions, and active sessions
        </p>
      </div>

      {/* Live Sessions */}
      {live && live.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span className="text-sm font-medium text-slate-300">Live Sessions</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#10b98120', color: '#10b981' }}>
              {aliveSessions.length} running
            </span>
          </div>
          <div className="space-y-2">
            {live.map(s => {
              const home = s.cwd.replace(/^\/Users\/[^/]+/, '~')
              const uptimeMs = s.started_at ? Date.now() - s.started_at : null
              const uptime = uptimeMs ? Math.round(uptimeMs / 60000) + 'm' : null
              return (
                <div
                  key={s.pid}
                  className="flex items-start gap-3 rounded-lg px-4 py-3"
                  style={{ background: '#13151e', border: `1px solid ${s.is_alive ? '#10b98130' : COLORS.border}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200 truncate">{home || s.session_id.slice(0, 8)}</span>
                      <Badge label={s.status || 'unknown'} color={s.status === 'waiting' ? '#f59e0b' : '#10b981'} />
                      <Badge label={s.entrypoint} color="#6366f1" />
                      {!s.is_alive && <Badge label="dead" color="#f87171" />}
                    </div>
                    {s.waiting_for && (
                      <div className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                        Waiting for: {s.waiting_for}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: '#64748b' }}>
                      <span>PID {s.pid}</span>
                      <span>v{s.version}</span>
                      {uptime && <span><Clock size={10} className="inline mr-1" />{uptime}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Global settings */}
      <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={15} style={{ color: '#6366f1' }} />
          <span className="text-sm font-medium text-slate-300">Global Settings</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Startups', value: gs.num_startups?.toString() ?? '—', color: '#60a5fa' },
            { label: 'Install Method', value: gs.install_method ?? '—', color: '#a78bfa' },
            { label: 'Theme', value: gs.theme ?? '—', color: '#34d399' },
            { label: 'Auto Updates', value: gs.auto_updates ? 'on' : 'off', color: gs.auto_updates ? '#10b981' : '#f87171' },
            { label: 'Version', value: gs.last_release_notes_seen ?? '—', color: '#94a3b8' },
            { label: 'First Start', value: gs.first_start_time ? new Date(gs.first_start_time).toLocaleDateString() : '—', color: '#94a3b8' },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: '#13151e' }}>
              <div className="text-xs mb-1" style={{ color: '#475569' }}>{item.label}</div>
              <div className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        {gs.model_config && (
          <div className="mt-4 rounded-lg p-3" style={{ background: '#13151e' }}>
            <div className="text-xs mb-2" style={{ color: '#64748b' }}>Model Configuration</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {gs.model_config.base_url && (
                <div><span style={{ color: '#475569' }}>Base URL: </span><span className="font-mono" style={{ color: '#38bdf8' }}>{gs.model_config.base_url}</span></div>
              )}
              <div><span style={{ color: '#475569' }}>Default: </span><span style={{ color: '#818cf8' }}>{gs.model_config.default_model || '—'}</span></div>
              <div><span style={{ color: '#475569' }}>Opus: </span><span style={{ color: '#818cf8' }}>{gs.model_config.opus_model || '—'}</span></div>
              <div><span style={{ color: '#475569' }}>Sonnet: </span><span style={{ color: '#818cf8' }}>{gs.model_config.sonnet_model || '—'}</span></div>
              <div><span style={{ color: '#475569' }}>Haiku: </span><span style={{ color: '#818cf8' }}>{gs.model_config.haiku_model || '—'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Global MCP servers */}
      <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Server size={15} style={{ color: '#f472b6' }} />
          <span className="text-sm font-medium text-slate-300">Global MCP Servers</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f472b620', color: '#f472b6' }}>
            {config.global_mcp_servers.length}
          </span>
        </div>
        {config.global_mcp_servers.length === 0 ? (
          <div className="text-sm" style={{ color: '#475569' }}>No global MCP servers configured</div>
        ) : (
          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {config.global_mcp_servers.map(s => <McpServerRow key={s.name} s={s} />)}
          </div>
        )}
      </div>

      {/* Per-project config (allowedTools + project MCP) */}
      <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} style={{ color: '#10b981' }} />
          <span className="text-sm font-medium text-slate-300">Project Permissions & MCP</span>
          <span className="text-xs" style={{ color: '#64748b' }}>— tool allow-lists and per-project servers</span>
        </div>
        <div className="text-xs rounded-lg px-3 py-2 mb-4" style={{ background: '#1e293b', color: '#94a3b8' }}>
          <strong style={{ color: '#f59e0b' }}>Where allowed tools come from:</strong> When you click "Always Allow" on a tool prompt, or run <code className="font-mono">/allowed-tools</code> in Claude Code, the tool name is added to <code className="font-mono">allowedTools</code> for that project in <code className="font-mono">~/.claude/.claude.json</code>.
        </div>
        <div className="space-y-2">
          {config.projects.filter(p => p.allowed_tools.length > 0 || p.mcp_servers.length > 0 || (p.last_cost && p.last_cost > 0)).map(p => (
            <ProjectRow key={p.path} p={p} />
          ))}
          {config.projects.every(p => p.allowed_tools.length === 0 && p.mcp_servers.length === 0) && (
            <div className="text-sm" style={{ color: '#475569' }}>
              No project-specific tool permissions or MCP servers configured yet.
              Projects appear here when you grant "Always Allow" to a tool or add a project-level MCP server.
            </div>
          )}
        </div>
      </div>

      {/* Installed plugins marketplace */}
      {config.installed_plugins.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Puzzle size={15} style={{ color: '#a78bfa' }} />
            <span className="text-sm font-medium text-slate-300">Installed Marketplace Plugins</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#a78bfa20', color: '#a78bfa' }}>
              {config.installed_plugins.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {config.installed_plugins.map(p => {
              const transportColor = p.transport === 'http' ? '#38bdf8' : p.transport === 'docker' ? '#f472b6' : '#34d399'
              return (
                <div key={p.name} className="rounded-lg px-3 py-2.5" style={{ background: '#13151e', border: `1px solid ${COLORS.border}` }}>
                  <div className="text-sm font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: transportColor }}>{p.transport}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skill usage */}
      {config.skill_usage.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-medium text-slate-300">Skill Usage</span>
          </div>
          <div className="space-y-2">
            {config.skill_usage.map(s => (
              <div key={s.name} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: '#13151e' }}>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-200">{s.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                  {s.last_used_at && <span>{new Date(s.last_used_at).toLocaleDateString()}</span>}
                  <span className="font-bold" style={{ color: '#f59e0b' }}>{s.usage_count}×</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
