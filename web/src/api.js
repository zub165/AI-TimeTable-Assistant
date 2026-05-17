import axios from 'axios'

/**
 * API base URL
 * - Dev: /api (proxied to local Django desktop on :8100)
 * - GitHub Pages: set GitHub secret VITE_API_URL → GoDaddy VPS when live
 */
const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({ baseURL, timeout: 15000 })

export function getApiMode() {
  if (import.meta.env.DEV) return 'local'
  if (baseURL.startsWith('http')) return 'production'
  return 'pages-no-api'
}

export async function fetchActivities() {
  const { data } = await api.get('/activities/')
  return data
}

export async function startActivity(name) {
  const { data } = await api.post('/activities/start/', { name })
  return data
}

export async function stopActivity(name) {
  const { data } = await api.post('/activities/stop/', { name })
  return data
}

export async function clearActivities() {
  await api.delete('/activities/')
}

export async function fetchSchedule() {
  const { data } = await api.get('/schedule/')
  return data
}

export async function saveSchedule(schedule) {
  const { data } = await api.put('/schedule/', schedule)
  return data
}

export async function checkHealth() {
  const { data } = await api.get('/health/')
  return data
}
