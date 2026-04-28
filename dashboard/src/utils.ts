export const fmt = {
  tokens(n: number): string {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
    return n.toLocaleString()
  },

  cost(n: number): string {
    return `$${n.toFixed(2)}`
  },

  num(n: number): string {
    return n.toLocaleString()
  },

  pct(n: number): string {
    return `${n.toFixed(1)}%`
  },

  reltime(ts: string | null | undefined): string {
    if (!ts) return 'Never'
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`
    return new Date(ts).toLocaleDateString()
  },

  shortdate(ts: string | null | undefined): string {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  },

  modelName(m: string): string {
    if (m.includes('sonnet')) return 'Sonnet'
    if (m.includes('haiku')) return 'Haiku'
    if (m.includes('opus')) return 'Opus'
    if (m === 'unknown') return 'Unknown'
    return m
  },
}

export const COLORS = {
  cost: '#f59e0b',
  sessions: '#3b82f6',
  tools: '#10b981',
  cache: '#8b5cf6',
  input: '#60a5fa',
  output: '#a78bfa',
  cacheRead: '#34d399',
  cacheCreate: '#fbbf24',
  mcp: '#f472b6',
  builtin: '#34d399',
  card: '#1a1d27',
  border: '#2a2d3e',
  bg: '#0f1117',
  sidebar: '#13151e',
}
