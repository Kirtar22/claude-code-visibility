import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type {
  Overview, Project, ToolsData, TimelinePoint,
  ActivityDay, MemoryFile, Session, ModelStats, HistoryEntry, SessionDetail,
  ConfigData, LiveSession
} from '../types'

function useApiData<T>(fetcher: () => Promise<T>, interval = 30_000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await fetcher()
      setData(d)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    load()
    const id = setInterval(load, interval)
    return () => clearInterval(id)
  }, [load, interval])

  return { data, loading, error, lastUpdated, refetch: load }
}

export const useOverview = () => useApiData<Overview>(api.overview)
export const useProjects = () => useApiData<Project[]>(api.projects)
export const useTools = () => useApiData<ToolsData>(api.tools)
export const useTimeline = () => useApiData<TimelinePoint[]>(api.timeline)
export const useActivity = () => useApiData<ActivityDay[]>(api.activity)
export const useMemory = () => useApiData<MemoryFile[]>(api.memory)
export const useSessions = () => useApiData<Session[]>(api.sessions)
export const useModels = () => useApiData<Record<string, ModelStats>>(api.models)
export const useHistory = () => useApiData<HistoryEntry[]>(api.history)
export const useConfig = () => useApiData<ConfigData>(api.config, 60_000)
export const useLive = () => useApiData<LiveSession[]>(api.live, 10_000)

export function useSessionDetail(sessionId: string | null) {
  const [data, setData] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch(`http://localhost:8000/api/sessions/${sessionId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [sessionId])

  return { data, loading, error }
}
