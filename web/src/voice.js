const VOICE_PREF = 'aitime_voice_speak'

export function getVoiceSpeakEnabled() {
  try {
    return localStorage.getItem(VOICE_PREF) !== '0'
  } catch {
    return true
  }
}

export function setVoiceSpeakEnabled(on) {
  try {
    localStorage.setItem(VOICE_PREF, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function speechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function synthesisSupported() {
  return !!window.speechSynthesis
}

let speaking = false

export function speak(text, { enabled = true, rate = 0.95, pitch = 1 } = {}) {
  if (!enabled || !text || !synthesisSupported()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = rate
  u.pitch = pitch
  u.lang = 'en-US'
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (v) => v.lang.startsWith('en') && /samantha|google us|female|natural/i.test(v.name),
  )
  if (preferred) u.voice = preferred
  u.onstart = () => { speaking = true }
  u.onend = () => { speaking = false }
  u.onerror = () => { speaking = false }
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (synthesisSupported()) window.speechSynthesis.cancel()
  speaking = false
}

export function isSpeaking() {
  return speaking
}

export function createRecognizer({ onResult, onStatus, onEnd, onError, continuous = true }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.lang = 'en-US'
  rec.continuous = continuous
  rec.interimResults = true
  let lastFinal = ''

  rec.onstart = () => onStatus?.('listening')
  rec.onresult = (event) => {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript
      if (event.results[i].isFinal) final += chunk
      else interim += chunk
    }
    if (interim) onStatus?.(`… ${interim}`)
    if (final) {
      lastFinal = (lastFinal + ' ' + final).trim()
      onResult?.(lastFinal, true)
      lastFinal = ''
    }
  }
  rec.onerror = (e) => {
    onError?.(e.error || 'error')
    onEnd?.()
  }
  rec.onend = () => onEnd?.()
  return rec
}

export function parseVoiceIntent(transcript) {
  const raw = (transcript || '').trim()
  const t = raw.toLowerCase()
  if (!t) return { intent: 'none' }

  const after = (word) => {
    const i = t.indexOf(word)
    if (i < 0) return ''
    return raw.slice(i + word.length).replace(/^[\s,.:]+/, '').trim()
  }

  if (/^(hi|hello|hey|good morning|good evening)/.test(t)) return { intent: 'greet' }
  if (/\bhelp\b|\bcommands\b|\bwhat can you\b/.test(t)) return { intent: 'help' }

  if (/\b(stop all|stop everything|end all)\b/.test(t)) return { intent: 'stop_all' }

  if (/\b(start|begin|track)\b/.test(t)) {
    const name =
      after('start tracking') ||
      after('begin tracking') ||
      after('start') ||
      after('begin') ||
      after('track')
    if (name) return { intent: 'start', name }
  }

  if (/\b(stop|end|finish)\b/.test(t) && !/\bstop all\b/.test(t)) {
    const name = after('stop tracking') || after('stop') || after('end') || after('finish')
    if (name && !/^(all|everything)$/i.test(name)) return { intent: 'stop', name }
  }

  if (/\bpomodoro\b/.test(t)) {
    return { intent: t.includes('stop') || t.includes('end') ? 'pomodoro_stop' : 'pomodoro_start' }
  }

  if (/\b(how am i|how's my day|summary|status|report)\b/.test(t)) return { intent: 'summary' }
  if (/\b(analyze|advice|coach|insights)\b/.test(t)) return { intent: 'analyze' }
  if (/\boptimize\b/.test(t) && /\b(schedule|plan|day)\b/.test(t)) return { intent: 'optimize' }
  if (/\b(what should|what now|suggest|recommend)\b/.test(t)) return { intent: 'suggest' }
  if (/\b(clear|reset)\b/.test(t) && /\b(activities|data|all)\b/.test(t)) return { intent: 'clear' }
  if (/\b(schedule|plan my day|goals)\b/.test(t)) return { intent: 'plan' }
  if (/\b(stats|statistics|week)\b/.test(t)) return { intent: 'stats' }

  return { intent: 'chat', text: raw }
}
