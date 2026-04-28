const BASE = 'http://localhost:8000/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const api = {
  overview: () => get<import('./types').Overview>('overview'),
  projects: () => get<import('./types').Project[]>('projects'),
  tools: () => get<import('./types').ToolsData>('tools'),
  timeline: () => get<import('./types').TimelinePoint[]>('timeline'),
  activity: () => get<import('./types').ActivityDay[]>('activity'),
  memory: () => get<import('./types').MemoryFile[]>('memory'),
  sessions: () => get<import('./types').Session[]>('sessions'),
  models: () => get<Record<string, import('./types').ModelStats>>('models'),
  history: () => get<import('./types').HistoryEntry[]>('history'),
  sessionDetail: (id: string) => get<import('./types').SessionDetail>(`sessions/${id}`),
  config: () => get<import('./types').ConfigData>('config'),
  live: () => get<import('./types').LiveSession[]>('live'),
}
