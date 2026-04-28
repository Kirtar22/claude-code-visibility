import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Overview from './pages/Overview'
import Projects from './pages/Projects'
import Tools from './pages/Tools'
import Sessions from './pages/Sessions'
import Memory from './pages/Memory'
import Models from './pages/Models'
import SessionDetail from './components/SessionDetail'
import Config from './pages/Config'

export type Page = 'overview' | 'projects' | 'tools' | 'sessions' | 'memory' | 'models' | 'config'

type SessionDetailMeta = {
  project_name: string
  cost: number
  last_ts: string | null
  messages: number
  tool_count: number
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sessionDetail, setSessionDetail] = useState<{ id: string; meta: SessionDetailMeta } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    setLastUpdated(new Date())
  }, [])

  const handleOpenDetail = useCallback((id: string, meta: SessionDetailMeta) => {
    setSessionDetail({ id, meta })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117', color: '#e2e8f0' }}>
      <Sidebar page={page} setPage={setPage} lastUpdated={lastUpdated} onRefresh={handleRefresh} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />
      <main className="flex-1 overflow-auto">
        {page === 'overview' && <Overview key={refreshKey} onLoad={setLastUpdated} navigate={setPage} />}
        {page === 'projects' && <Projects key={refreshKey} />}
        {page === 'tools' && <Tools key={refreshKey} />}
        {page === 'sessions' && <Sessions key={refreshKey} onOpenDetail={handleOpenDetail} />}
        {page === 'memory' && <Memory key={refreshKey} />}
        {page === 'models' && <Models key={refreshKey} />}
        {page === 'config' && <Config key={refreshKey} />}
      </main>
      {sessionDetail && (
        <SessionDetail
          sessionId={sessionDetail.id}
          sessionMeta={sessionDetail.meta}
          onClose={() => setSessionDetail(null)}
        />
      )}
    </div>
  )
}
