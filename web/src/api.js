import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({ baseURL, timeout: 15000 })

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
