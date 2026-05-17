import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'
export const api = axios.create({ baseURL, timeout: 15000 })

export function getApiMode() {
  if (import.meta.env.DEV) return 'local'
  if (baseURL.startsWith('http')) return 'production'
  return 'pages-no-api'
}

/** True when we should call a real backend (dev proxy or VPS URL). */
export function hasRemoteApi() {
  return getApiMode() !== 'pages-no-api'
}

export const checkHealth = () => api.get('/health/').then((r) => r.data)
export const fetchActivities = (date) =>
  api.get('/activities/', { params: date ? { date } : {} }).then((r) => r.data)
export const startActivity = (name, category) =>
  api.post('/activities/start/', { name, category }).then((r) => r.data)
export const stopActivity = (name) =>
  api.post('/activities/stop/', { name }).then((r) => r.data)
export const stopAllActivities = () =>
  api.post('/activities/stop-all/').then((r) => r.data)
export const deleteActivity = (id) => api.delete(`/activities/${id}/`)
export const manualActivity = (body) =>
  api.post('/activities/manual/', body).then((r) => r.data)
export const clearActivities = () => api.delete('/activities/')
export const fetchSchedule = () => api.get('/schedule/').then((r) => r.data)
export const saveSchedule = (schedule) => api.put('/schedule/', schedule).then((r) => r.data)
export const fetchSummary = (date) =>
  api.get('/summary/', { params: date ? { date } : {} }).then((r) => r.data)
export const fetchWeekStats = () => api.get('/stats/week/').then((r) => r.data)
export const fetchHistory = (from, to) =>
  api.get('/history/', { params: { from, to } }).then((r) => r.data)
export const fetchExport = () => api.get('/export/').then((r) => r.data)
export const downloadExport = () =>
  api.get('/export/', { params: { download: '1' }, responseType: 'blob' })
export const fetchQuickStarts = () => api.get('/quick-starts/').then((r) => r.data)
export const startPomodoro = () => api.post('/pomodoro/start/').then((r) => r.data)
export const stopPomodoro = () => api.post('/pomodoro/stop/').then((r) => r.data)
