export function detectDevice() {
  const ua = navigator.userAgent.toLowerCase()
  const w = window.innerWidth
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const tvUa = /smart-tv|smarttv|tizen|webos|googletv|appletv|hbbtv|netcast|viera/i.test(navigator.userAgent)
  if (tvUa || (w >= 1600 && !coarse)) return 'tv'
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua) || (w >= 768 && w <= 1200 && coarse))
    return 'tablet'
  if (/iphone|ipod|android.*mobile|windows phone/i.test(ua) || w < 768) return 'phone'
  return 'desktop'
}

export function buildInsights(activities, schedule, activeCount) {
  const chips = []
  const hour = new Date().getHours()
  const totals = {}
  activities.forEach((a) => {
    const n = (a.name || '').toLowerCase()
    let c = 'other'
    if (n.match(/sleep|nap/)) c = 'sleep'
    else if (n.match(/work|code|job/)) c = 'work'
    else if (n.match(/exercise|gym|run/)) c = 'exercise'
    else if (n.match(/eat|food|meal/)) c = 'eat'
    totals[c] = (totals[c] || 0) + (a.duration_hours || 0)
  })
  const planned = Object.values(schedule).reduce((s, v) => s + (Number(v) || 0), 0)
  if (planned > 24) chips.push('Planned hours exceed 24h — trim work or entertainment.')
  if ((totals.work || 0) > (schedule.work || 8)) chips.push('Work exceeds plan — schedule a break.')
  if ((totals.exercise || 0) < (schedule.exercise || 1) * 0.5) chips.push('Add 20+ minutes of movement.')
  if (activeCount > 2) chips.push('Too many active tasks — finish one first.')
  if (hour >= 22 && (totals.work || 0) > 2) chips.push('Late work — wind down for better sleep.')
  if (!chips.length) chips.push('Balanced rhythm — protect your next focus block.')
  return chips
}

export function optimizeSchedule(schedule) {
  const s = { ...schedule }
  const total = Object.values(s).reduce((a, b) => a + (Number(b) || 0), 0)
  if (total > 24) {
    const scale = 23.5 / total
    Object.keys(s).forEach((k) => {
      if (k !== 'client_id') s[k] = Math.round((s[k] || 0) * scale * 4) / 4
    })
  }
  return s
}

export function suggestActivity() {
  const hour = new Date().getHours()
  if (hour < 10) return 'morning planning'
  if (hour < 14) return 'focused work'
  if (hour < 18) return 'exercise'
  if (hour < 21) return 'family time'
  return 'wind down'
}
