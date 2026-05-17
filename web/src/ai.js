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
      if (['client_id', 'daily_note', 'pomodoro_minutes', 'updated_at'].includes(k)) return
      s[k] = Math.round((s[k] || 0) * scale * 4) / 4
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

export function getAssistantGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning. I'm your AI time coach — tap the mic and tell me what you're doing."
  if (hour < 17) return "Good afternoon. I'm listening — say start work, or ask how your day is going."
  return "Good evening. I'm your talking time assistant — say what to track or ask for a day summary."
}

export function buildTalkReply(utterance, ctx) {
  const {
    activities = [],
    schedule = {},
    activeSessions = [],
    summary = null,
  } = ctx
  const t = (utterance || '').toLowerCase().trim()
  const hour = new Date().getHours()
  const activeNames = activeSessions.map((s) => s.name).join(', ')
  const tracked = summary?.total_hours_tracked ?? activities.reduce((s, a) => s + (a.duration_hours || 0), 0)
  const planned = summary?.total_hours_planned ?? 0

  if (/\b(thank|thanks)\b/.test(t)) {
    return "You're welcome. I'll keep watching your schedule."
  }
  if (/\b(tired|exhausted|burnout)\b/.test(t)) {
    return 'Sounds like you need recovery. Stop what you can, take a short walk, and protect sleep tonight.'
  }
  if (/\b(focus|concentrate|deep work)\b/.test(t)) {
    return 'For focus, start one task, silence notifications, and try a 25-minute Pomodoro. Say start Pomodoro when ready.'
  }
  if (/\b(sleep|bed|rest)\b/.test(t)) {
    const sleepGoal = schedule.sleep || 8
    return `Your sleep goal is ${sleepGoal} hours. If it's after 10 PM, wind down and stop heavy work.`
  }
  if (/\b(work|job|code|study)\b/.test(t) && !/\b(how|stop)\b/.test(t)) {
    return activeNames
      ? `You're already tracking ${activeNames}. Say stop ${activeSessions[0]?.name || 'work'} when you finish.`
      : 'Say start work or start coding and I will track it for you.'
  }

  const chips = buildInsights(activities, schedule, activeSessions.length)
  const tip = chips[0]

  if (activeSessions.length) {
    return `You're tracking ${activeNames}. So far today about ${Number(tracked).toFixed(1)} hours logged. ${tip}`
  }
  if (tracked > 0) {
    return `Today you've logged ${Number(tracked).toFixed(1)} hours of ${planned ? `${Number(planned).toFixed(1)} planned` : 'your plan'}. ${tip}`
  }

  if (hour < 10) {
    return `Let's plan the morning. ${tip} Try saying start followed by your first task.`
  }
  if (hour < 18) {
    return `${tip} Tell me start and an activity name, or ask what should I do now.`
  }
  return `${tip} Ask me for a day summary or say start wind down when you're ready to relax.`
}

export function helpVoiceCommands() {
  return [
    'Say: "Start coding" or "Begin exercise" to track time.',
    'Say: "Stop work" to finish a task.',
    'Ask: "How am I doing?" or "Give me advice" for coaching.',
    'Say: "Optimize my schedule" or "What should I do now?"',
    'Say: "Start Pomodoro" for a focus timer.',
    'Say: "Stop everything" to end all active tasks.',
  ]
}

export function spokenForIntent(intent, payload = {}) {
  switch (intent) {
    case 'greet':
      return getAssistantGreeting()
    case 'help':
      return 'I can start and stop activities, analyze your day, optimize your schedule, and run Pomodoro timers. Say help anytime for examples.'
    case 'start':
      return `Starting ${payload.name}. I'll track your time.`
    case 'stop':
      return `Stopped ${payload.name}. Nice work.`
    case 'stop_all':
      return 'Stopped all activities.'
    case 'pomodoro_start':
      return `Pomodoro started. Focus for ${payload.minutes || 25} minutes.`
    case 'pomodoro_stop':
      return 'Pomodoro complete. Take a short break.'
    case 'summary':
      return payload.spoken || 'Here is your day summary.'
    case 'analyze':
      return payload.spoken || 'I analyzed your day. Check the insights on screen.'
    case 'optimize':
      return 'I balanced your schedule to fit 24 hours. Review the plan tab if you like.'
    case 'suggest':
      return `Try ${payload.pick || suggestActivity()} next. Say start and the activity name.`
    case 'clear':
      return 'All activities cleared.'
    case 'plan':
      return 'Open the plan tab to set sleep, work, and other daily goals, or say optimize my schedule.'
    case 'stats':
      return payload.spoken || 'Your stats are on the stats tab.'
    default:
      return payload.reply || ''
  }
}
