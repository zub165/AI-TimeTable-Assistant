export const DEFAULT_SCHEDULE = {
  client_id: 'default',
  sleep: 8,
  work: 8,
  eat: 1.5,
  exercise: 1,
  prayer: 0.5,
  read: 1,
  entertainment: 2,
  daily_note: '',
  pomodoro_minutes: 25,
}

export const SCHEDULE_LABELS = [
  { key: 'sleep', label: 'Sleep', color: '#4895ef' },
  { key: 'work', label: 'Work', color: '#4361ee' },
  { key: 'eat', label: 'Eating', color: '#4cc9f0' },
  { key: 'exercise', label: 'Exercise', color: '#f72585' },
  { key: 'prayer', label: 'Prayer', color: '#2a9d8f' },
  { key: 'read', label: 'Reading', color: '#3a0ca3' },
  { key: 'entertainment', label: 'Entertainment', color: '#7209b7' },
]

export const CATEGORIES = ['sleep', 'work', 'eat', 'exercise', 'prayer', 'read', 'entertainment']

export const TABS = [
  { id: 'coach', label: 'Talk', short: 'Talk', desc: 'Talking AI time assistant' },
  { id: 'track', label: 'Track', short: 'Track', desc: 'Voice, timer, log time' },
  { id: 'plan', label: 'Plan', short: 'Plan', desc: 'Schedule & daily note' },
  { id: 'stats', label: 'Stats', short: 'Stats', desc: 'Goals vs actual, week' },
  { id: 'tools', label: 'Tools', short: 'Tools', desc: 'Export, history, data' },
]

export const QUICK_STARTS = [
  'coding', 'work', 'exercise', 'prayer', 'reading',
  'meal', 'family time', 'meeting', 'break',
]

export const DEVICE_LABELS = {
  phone: 'iPhone / Phone',
  tablet: 'iPad / Tablet',
  tv: 'Smart TV',
  desktop: 'Desktop',
}

export function categorize(name) {
  const n = (name || '').toLowerCase()
  if (n.match(/sleep|nap/)) return 'sleep'
  if (n.match(/work|code|job|study|meeting/)) return 'work'
  if (n.match(/eat|food|meal|lunch/)) return 'eat'
  if (n.match(/exercise|gym|run|walk/)) return 'exercise'
  if (n.match(/pray|prayer|fajr/)) return 'prayer'
  if (n.match(/read|book/)) return 'read'
  return 'entertainment'
}
