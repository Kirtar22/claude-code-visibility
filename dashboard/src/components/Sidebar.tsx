import { Activity, LayoutDashboard, FolderGit2, Wrench, MessageSquare, Brain, Cpu, RefreshCw, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Page } from '../App'
import type { LucideIcon } from 'lucide-react'
import { COLORS } from '../utils'

const NAV: { id: Page; label: string; Icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', Icon: FolderGit2 },
  { id: 'tools', label: 'Tools', Icon: Wrench },
  { id: 'sessions', label: 'Sessions', Icon: MessageSquare },
  { id: 'memory', label: 'Memory', Icon: Brain },
  { id: 'models', label: 'Models', Icon: Cpu },
  { id: 'config', label: 'Config', Icon: Settings },
]

interface Props {
  page: Page
  setPage: (p: Page) => void
  lastUpdated: Date | null
  onRefresh: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ page, setPage, lastUpdated, onRefresh, collapsed, onToggleCollapse }: Props) {
  const since = lastUpdated
    ? Math.round((Date.now() - lastUpdated.getTime()) / 1000)
    : null

  return (
    <div
      className="flex-shrink-0 flex flex-col border-r transition-all duration-200 relative"
      style={{
        width: collapsed ? 52 : 208,
        background: COLORS.sidebar,
        borderColor: COLORS.border,
      }}
    >
      {/* Floating toggle tab on the right edge */}
      <button
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute z-10 flex items-center justify-center rounded-full transition-all"
        style={{
          top: '50%',
          right: -12,
          transform: 'translateY(-50%)',
          width: 24,
          height: 24,
          background: '#1e293b',
          border: `1px solid ${COLORS.border}`,
          color: '#94a3b8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = '#10b98120'
          ;(e.currentTarget as HTMLElement).style.color = '#10b981'
          ;(e.currentTarget as HTMLElement).style.borderColor = '#10b98150'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = '#1e293b'
          ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
          ;(e.currentTarget as HTMLElement).style.borderColor = COLORS.border
        }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
      {/* Logo */}
      <div
        className="flex items-center border-b"
        style={{
          borderColor: COLORS.border,
          padding: collapsed ? '18px 14px' : '18px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 8,
        }}
      >
        <Activity size={18} style={{ color: '#10b981', flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-slate-100 leading-tight">Claude Code</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>Visibility</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={collapsed ? label : undefined}
              className="w-full flex items-center rounded-lg text-sm transition-all"
              style={{
                gap: collapsed ? 0 : 12,
                padding: collapsed ? '8px 0' : '8px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: active ? '#10b981' : '#94a3b8',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <Icon size={15} />
              {!collapsed && label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t" style={{ borderColor: COLORS.border, padding: collapsed ? '8px 6px' : '12px' }}>
        {!collapsed && (
          <>
            <button
              onClick={onRefresh}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all mb-2"
              style={{ color: '#64748b' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#94a3b8')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
            >
              <RefreshCw size={12} />
              Refresh now
            </button>
            <div className="px-3 text-xs mb-2" style={{ color: '#475569' }}>
              {since !== null ? `Updated ${since}s ago` : 'Loading…'}
              <br />
              <span style={{ color: '#374151' }}>Auto-refresh: 30s</span>
            </div>
          </>
        )}
        {collapsed && (
          <button
            onClick={onRefresh}
            title="Refresh"
            className="w-full flex items-center justify-center py-2 rounded-lg transition-all mb-1"
            style={{ color: '#64748b' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#94a3b8')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#64748b')}
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
