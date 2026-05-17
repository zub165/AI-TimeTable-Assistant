import { CATEGORIES, DEFAULT_SCHEDULE, categorize } from './constants'

const KEYS = {
  activities: 'aitime_activities',
  active: 'aitime_active',
  schedule: 'aitime_schedule',
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
  const activities = readJson(KEYS.activities, []).map((a, i) => ({
    id: a.id ?? i + 1,
    name: a.name,
    duration_hours: a.duration_hours ?? 0,
    start_time: a.start_time,
    end_time: a.end_time,
    activity_date: a.activity_date,
    category: a.category || categorize(a.name),
  }))
  const activeRaw = readJson(KEYS.active, {})
  const active_sessions = Object.entries(activeRaw).map(([name, v], i) => ({
    id: `local-${i}`,
    name,
    start_time: typeof v === 'string' ? v : v.start_time,
    category: typeof v === 'object' ? v.category : categorize(name),
  }))
  return { activities, active_sessions }
}

export function localFetchSchedule() {
  return { ...DEFAULT_SCHEDULE, ...readJson(KEYS.schedule, {}) }
}

export function localSaveSchedule(schedule) {
  writeJson(KEYS.schedule, schedule)
  return schedule
}

export function localStartActivity(name) {
  const active = readJson(KEYS.active, {})
  if (active[name]) throw new Error('already tracking')
  active[name] = { start_time: new Date().toISOString(), category: categorize(name) }
  writeJson(KEYS.active, active)
  return active[name]
}

export function localStopActivity(name) {
  const active = readJson(KEYS.active, {})
  const entry = active[name]
  if (!entry) throw new Error('not tracking')
  const startIso = typeof entry === 'string' ? entry : entry.start_time
  const start = new Date(startIso)
  const end = new Date()
  const duration_hours = (end - start) / 3600000
  delete active[name]
  writeJson(KEYS.active, active)
  const activities = readJson(KEYS.activities, [])
  const record = {
    id: Date.now(),
    name,
    duration_hours,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    activity_date: start.toISOString().slice(0, 10),
    category: typeof entry === 'object' ? entry.category : categorize(name),
  }
  activities.push(record)
  writeJson(KEYS.activities, activities)
  return record
}

export function localStopAll() {
  const active = readJson(KEYS.active, {})
  const names = Object.keys(active)
  const stopped = []
  names.forEach((name) => {
    try {
      stopped.push(localStopActivity(name))
    } catch {
      /* skip */
    }
  })
  return { stopped, count: stopped.length }
}

export function localDeleteActivity(id) {
  const activities = readJson(KEYS.activities, []).filter((a) => a.id !== id)
  writeJson(KEYS.activities, activities)
}

export function localManualActivity({ name, duration_hours, date }) {
  const end = new Date()
  const start = new Date(end.getTime() - duration_hours * 3600000)
  const activities = readJson(KEYS.activities, [])
  const record = {
    id: Date.now(),
    name,
    duration_hours,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    activity_date: date || start.toISOString().slice(0, 10),
    category: categorize(name),
  }
  activities.push(record)
  writeJson(KEYS.activities, activities)
  return record
}

export function localClearActivities() {
  writeJson(KEYS.activities, [])
  writeJson(KEYS.active, {})
}

export function localSummary(targetDate) {
  const data = localFetchActivities()
  const sched = localFetchSchedule()
  const day = targetDate || new Date().toISOString().slice(0, 10)
  const acts = data.activities.filter((a) => a.activity_date === day)
  const by_category = {}
  CATEGORIES.forEach((c) => {
    by_category[c] = { actual: 0, goal: Number(sched[c]) || 0, diff: 0 }
  })
  acts.forEach((a) => {
    const c = a.category || categorize(a.name)
    if (!by_category[c]) by_category[c] = { actual: 0, goal: 0, diff: 0 }
    by_category[c].actual += a.duration_hours
  })
  data.active_sessions.forEach((s) => {
    const c = s.category || categorize(s.name)
    const elapsed = (Date.now() - new Date(s.start_time).getTime()) / 3600000
    if (!by_category[c]) by_category[c] = { actual: 0, goal: 0, diff: 0 }
    by_category[c].actual += elapsed
  })
  Object.keys(by_category).forEach((c) => {
    by_category[c].actual = Math.round(by_category[c].actual * 100) / 100
    by_category[c].diff = Math.round((by_category[c].actual - by_category[c].goal) * 100) / 100
  })
  const total = Object.values(by_category).reduce((s, x) => s + x.actual, 0)
  const goal = Object.values(by_category).reduce((s, x) => s + x.goal, 0)
  return {
    date: day,
    total_hours_tracked: Math.round(total * 100) / 100,
    total_hours_planned: Math.round(goal * 100) / 100,
    active_count: data.active_sessions.length,
    activity_count: acts.length,
    by_category,
    daily_note: sched.daily_note || '',
  }
}

export function localWeekStats() {
  const activities = readJson(KEYS.activities, [])
  const end = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const categories = {}
    CATEGORIES.forEach((c) => { categories[c] = 0 })
    let total = 0
    activities.filter((a) => a.activity_date === key).forEach((a) => {
      const c = a.category || categorize(a.name)
      categories[c] = Math.round(((categories[c] || 0) + a.duration_hours) * 100) / 100
      total += a.duration_hours
    })
    days.push({ date: key, total: Math.round(total * 100) / 100, categories })
  }
  const start = days[0]?.date
  const endKey = days[days.length - 1]?.date
  return { start, end: endKey, days }
}

export function localHistory(from, to) {
  const activities = readJson(KEYS.activities, [])
  const toD = to || new Date().toISOString().slice(0, 10)
  const fromD = from || (() => {
    const d = new Date(toD)
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })()
  const filtered = activities
    .filter((a) => a.activity_date >= fromD && a.activity_date <= toD)
    .sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || ''))
  return { from: fromD, to: toD, activities: filtered }
}

export function localStartPomodoro() {
  return localStartActivity('Pomodoro focus')
}

export function localStopPomodoro() {
  return localStopActivity('Pomodoro focus')
}

export function localExport() {
  return {
    exported_at: new Date().toISOString(),
    activities: readJson(KEYS.activities, []),
    active: readJson(KEYS.active, {}),
    schedule: readJson(KEYS.schedule, {}),
  }
}

export function localHealth() {
  return { status: 'ok', service: 'ai-time-local', mode: 'browser' }
}
