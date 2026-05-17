const KEY_ACTIVITIES = 'aitime_activities'
const KEY_ACTIVE = 'aitime_active'
const KEY_SCHEDULE = 'aitime_schedule'

const DEFAULT_SCHEDULE = {
  client_id: 'default',
  sleep: 8,
  work: 8,
  eat: 1.5,
  exercise: 1,
  prayer: 0.5,
  read: 1,
  entertainment: 2,
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function localFetchActivities() {
  const activities = readJson(KEY_ACTIVITIES, []).map((a, i) => ({
    id: a.id ?? i + 1,
    name: a.name,
    duration_hours: a.duration_hours ?? a.duration ?? 0,
    start_time: a.start_time,
    end_time: a.end_time,
    activity_date: a.activity_date,
    category: a.category || 'general',
  }))
  const activeRaw = readJson(KEY_ACTIVE, {})
  const active_sessions = Object.entries(activeRaw).map(([name, start_time], i) => ({
    id: `local-${i}`,
    name,
    start_time,
    category: 'general',
  }))
  return { activities, active_sessions }
}

export function localFetchSchedule() {
  return { ...DEFAULT_SCHEDULE, ...readJson(KEY_SCHEDULE, {}) }
}

export function localStartActivity(name) {
  const active = readJson(KEY_ACTIVE, {})
  if (active[name]) throw new Error('already tracking')
  active[name] = new Date().toISOString()
  writeJson(KEY_ACTIVE, active)
  return { name, start_time: active[name] }
}

export function localStopActivity(name) {
  const active = readJson(KEY_ACTIVE, {})
  if (!active[name]) throw new Error('not tracking')
  const start = new Date(active[name])
  const end = new Date()
  const duration_hours = (end - start) / 3600000
  delete active[name]
  writeJson(KEY_ACTIVE, active)
  const activities = readJson(KEY_ACTIVITIES, [])
  activities.push({
    id: Date.now(),
    name,
    duration_hours,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    activity_date: start.toISOString().slice(0, 10),
  })
  writeJson(KEY_ACTIVITIES, activities)
  return { name, duration_hours }
}

export function localClearActivities() {
  writeJson(KEY_ACTIVITIES, [])
  writeJson(KEY_ACTIVE, {})
}

export function localSaveSchedule(schedule) {
  writeJson(KEY_SCHEDULE, schedule)
  return schedule
}

export function localHealth() {
  return { status: 'ok', service: 'ai-time-local', mode: 'browser' }
}
