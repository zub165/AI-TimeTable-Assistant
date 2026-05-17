import { useCallback, useState } from 'react'
import {
  checkHealth,
  clearActivities,
  deleteActivity,
  downloadExport,
  fetchActivities,
  fetchExport,
  fetchHistory,
  fetchSchedule,
  fetchSummary,
  fetchWeekStats,
  getApiMode,
  hasRemoteApi,
  manualActivity,
  saveSchedule,
  startActivity,
  startPomodoro,
  stopActivity,
  stopAllActivities,
  stopPomodoro,
} from '../api'
import {
  localClearActivities,
  localDeleteActivity,
  localExport,
  localFetchActivities,
  localFetchSchedule,
  localHealth,
  localHistory,
  localManualActivity,
  localSaveSchedule,
  localStartActivity,
  localStartPomodoro,
  localStopActivity,
  localStopAll,
  localStopPomodoro,
  localSummary,
  localWeekStats,
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

  const loadFromBrowser = useCallback(() => {
    const data = localFetchActivities()
    const sched = localFetchSchedule()
    localHealth()
    setApiOk(true)
    setUseLocal(true)
    applyData(data.activities, data.active_sessions, sched)
    const mode = getApiMode()
    if (mode === 'pages-no-api') {
      setStatus('AI Time — saved in your browser (connect VPS API later)')
    } else {
      setStatus('Local mode — start backend on port 8100 to sync')
    }
  }, [applyData])

  const load = useCallback(async () => {
    if (!hasRemoteApi()) {
      loadFromBrowser()
      return
    }
    try {
      await checkHealth()
      const [act, sched] = await Promise.all([fetchActivities(), fetchSchedule()])
      setApiOk(true)
      setUseLocal(false)
      applyData(act.activities || [], act.active_sessions || [], sched)
      setStatus('Connected to cloud API')
    } catch {
      loadFromBrowser()
    }
  }, [applyData, loadFromBrowser])

  const withLocal = (localFn, apiFn) => async (...args) => {
    if (useLocal) return localFn(...args)
    return apiFn(...args)
  }

  const start = async (name) => {
    if (useLocal) {
      localStartActivity(name)
    } else {
      await startActivity(name)
    }
    await load()
  }

  const stop = async (name) => {
    if (useLocal) {
      localStopActivity(name)
    } else {
      await stopActivity(name)
    }
    await load()
  }

  const stopAll = async () => {
    if (useLocal) {
      localStopAll()
    } else {
      await stopAllActivities()
    }
    await load()
  }

  const removeActivity = async (id) => {
    if (useLocal) {
      localDeleteActivity(id)
    } else {
      await deleteActivity(id)
    }
    await load()
  }

  const logManual = async (body) => {
    if (useLocal) {
      localManualActivity(body)
    } else {
      await manualActivity(body)
    }
    await load()
  }

  const saveSched = async (sched) => {
    if (useLocal) {
      localSaveSchedule(sched)
      setSchedule(sched)
      runAI(activities, sched, activeSessions.length)
      return
    }
    await saveSchedule(sched)
    await load()
  }

  const clear = async () => {
    if (useLocal) {
      localClearActivities()
    } else {
      await clearActivities()
    }
    await load()
  }

  const getSummary = withLocal(localSummary, (date) => fetchSummary(date))
  const getWeekStats = withLocal(localWeekStats, fetchWeekStats)
  const getHistory = withLocal(localHistory, (from, to) => fetchHistory(from, to))
  const getExport = withLocal(localExport, fetchExport)

  const exportDownload = async () => {
    if (useLocal) {
      const data = localExport()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      return blob
    }
    const res = await downloadExport()
    return res.data
  }

  const pomodoroStart = async () => {
    if (useLocal) {
      localStartPomodoro()
      await load()
      return { minutes: schedule?.pomodoro_minutes || 25 }
    }
    const r = await startPomodoro()
    await load()
    return r
  }

  const pomodoroStop = async () => {
    if (useLocal) {
      localStopPomodoro()
    } else {
      await stopPomodoro()
    }
    await load()
  }

  const pomodoroActive = activeSessions.some((s) => s.name === 'Pomodoro focus')

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
    stopAll,
    removeActivity,
    logManual,
    saveSched,
    clear,
    getSummary,
    getWeekStats,
    getHistory,
    getExport,
    exportDownload,
    pomodoroStart,
    pomodoroStop,
    pomodoroActive,
  }
}
