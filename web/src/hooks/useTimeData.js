import { useCallback, useState } from 'react'
import {
  checkHealth,
  clearActivities,
  fetchActivities,
  fetchSchedule,
  getApiMode,
  saveSchedule,
  startActivity,
  stopActivity,
} from '../api'
import {
  localClearActivities,
  localFetchActivities,
  localFetchSchedule,
  localHealth,
  localSaveSchedule,
  localStartActivity,
  localStopActivity,
} from '../storage'

export function useTimeData(runAI) {
  const [apiOk, setApiOk] = useState(null)
  const [useLocal, setUseLocal] = useState(false)
  const [activities, setActivities] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [status, setStatus] = useState('Loading…')

  const applyData = useCallback(
    (acts, active, sched) => {
      setActivities(acts)
      setActiveSessions(active)
      setSchedule(sched)
      runAI(acts, sched, active.length)
    },
    [runAI],
  )

  const load = useCallback(async () => {
    try {
      await checkHealth()
      const [act, sched] = await Promise.all([fetchActivities(), fetchSchedule()])
      setApiOk(true)
      setUseLocal(false)
      applyData(act.activities || [], act.active_sessions || [], sched)
      setStatus('Connected to cloud API')
    } catch {
      const data = localFetchActivities()
      const sched = localFetchSchedule()
      localHealth()
      setApiOk(true)
      setUseLocal(true)
      applyData(data.activities, data.active_sessions, sched)
      const mode = getApiMode()
      if (mode === 'local') {
        setStatus('Local mode — start backend on port 8100 to sync')
      } else {
        setStatus('AI Time — saved in your browser (connect VPS API later)')
      }
    }
  }, [applyData])

  const start = async (name) => {
    if (useLocal) {
      localStartActivity(name)
      await load()
      return
    }
    await startActivity(name)
    await load()
  }

  const stop = async (name) => {
    if (useLocal) {
      localStopActivity(name)
      await load()
      return
    }
    await stopActivity(name)
    await load()
  }

  const saveSched = async (sched) => {
    if (useLocal) {
      localSaveSchedule(sched)
      setSchedule(sched)
      return
    }
    await saveSchedule(sched)
    await load()
  }

  const clear = async () => {
    if (useLocal) {
      localClearActivities()
      await load()
      return
    }
    await clearActivities()
    await load()
  }

  return {
    apiOk,
    useLocal,
    activities,
    activeSessions,
    schedule,
    status,
    setStatus,
    setSchedule,
    load,
    start,
    stop,
    saveSched,
    clear,
  }
}
