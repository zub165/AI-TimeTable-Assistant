import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildInsights,
  buildTalkReply,
  detectDevice,
  getAssistantGreeting,
  helpVoiceCommands,
  optimizeSchedule,
  spokenForIntent,
  suggestActivity,
} from './ai'
import {
  createRecognizer,
  getVoiceSpeakEnabled,
  parseVoiceIntent,
  setVoiceSpeakEnabled,
  speak,
  speechSupported,
  stopSpeaking,
  synthesisSupported,
} from './voice'
import {
  DEFAULT_SCHEDULE,
  DEVICE_LABELS,
  QUICK_STARTS,
  SCHEDULE_LABELS,
  TABS,
} from './constants'
import { useTimeData } from './hooks/useTimeData'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('coach')
  const [manualName, setManualName] = useState('')
  const [manualHours, setManualHours] = useState('0.5')
  const [listening, setListening] = useState(false)
  const [voiceSpeak, setVoiceSpeak] = useState(getVoiceSpeakEnabled)
  const [chatMessages, setChatMessages] = useState([])
  const [device, setDevice] = useState('desktop')
  const [aiInsights, setAiInsights] = useState([])
  const [aiStatus, setAiStatus] = useState('Your talking AI time assistant is ready')
  const [aiThinking, setAiThinking] = useState(false)
  const [summary, setSummary] = useState(null)
  const [weekStats, setWeekStats] = useState(null)
  const [history, setHistory] = useState(null)
  const [pomodoroLeft, setPomodoroLeft] = useState(null)
  const recognitionRef = useRef(null)
  const listeningRef = useRef(false)

  const pushChat = useCallback((role, text) => {
    if (!text?.trim()) return
    setChatMessages((m) => [...m.slice(-23), { id: `${Date.now()}-${role}`, role, text: text.trim() }])
  }, [])

  const assistantSay = useCallback(
    (text, { alsoInsight = false } = {}) => {
      if (!text) return
      pushChat('assistant', text)
      setAiStatus(text)
      if (alsoInsight) setAiInsights([text])
      if (voiceSpeak) speak(text, { enabled: true })
    },
    [pushChat, voiceSpeak],
  )

  const runAI = useCallback((acts, sched, active) => {
    const chips = buildInsights(acts, sched || DEFAULT_SCHEDULE, active)
    setAiInsights(chips)
    setAiStatus(`AI insights · ${DEVICE_LABELS[device] || device}`)
  }, [device])

  const {
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
  } = useTimeData(runAI)

  const sched = schedule || DEFAULT_SCHEDULE
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0]

  useEffect(() => {
    const updateDevice = () => setDevice(detectDevice())
    updateDevice()
    window.addEventListener('resize', updateDevice)
    load()
    const id = setInterval(load, 15000)
    return () => {
      window.removeEventListener('resize', updateDevice)
      clearInterval(id)
    }
  }, [load])

  useEffect(() => {
    document.body.className = `device-${device}`
    document.title = 'AI Time — Talking Time Assistant'
  }, [device])

  useEffect(() => {
    if (synthesisSupported()) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
    if (sessionStorage.getItem('aitime_greeted')) return
    sessionStorage.setItem('aitime_greeted', '1')
    const g = getAssistantGreeting()
    pushChat('assistant', g)
    setAiInsights(helpVoiceCommands())
    if (getVoiceSpeakEnabled()) speak(g, { enabled: true })
  }, [pushChat])

  useEffect(() => {
    if (device !== 'tv') return
    const onKey = (e) => {
      const idx = TABS.findIndex((t) => t.id === activeTab)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveTab(TABS[(idx + 1) % TABS.length].id)
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab, device])

  useEffect(() => {
    if (activeTab !== 'stats' && activeTab !== 'coach') return
    getSummary().then(setSummary).catch(() => setSummary(null))
    getWeekStats().then(setWeekStats).catch(() => setWeekStats(null))
  }, [activeTab, activities, activeSessions, getSummary, getWeekStats])

  useEffect(() => {
    if (activeTab !== 'tools') return
    getHistory().then((h) => setHistory(h)).catch(() => setHistory(null))
  }, [activeTab, activities, getHistory])

  useEffect(() => {
    if (!pomodoroActive) {
      setPomodoroLeft(null)
      return undefined
    }
    const session = activeSessions.find((s) => s.name === 'Pomodoro focus')
    const mins = Number(sched.pomodoro_minutes) || 25
    const tick = () => {
      if (!session?.start_time) return
      const elapsed = (Date.now() - new Date(session.start_time).getTime()) / 60000
      setPomodoroLeft(Math.max(0, Math.round(mins - elapsed)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pomodoroActive, activeSessions, sched.pomodoro_minutes])

  const totalPlanned = useMemo(
    () => SCHEDULE_LABELS.reduce((s, { key }) => s + (Number(sched[key]) || 0), 0),
    [sched],
  )

  const handleStart = async (name) => {
    const n = (name || manualName).trim()
    if (!n) return
    try {
      await start(n)
      setManualName('')
      setStatus(`Started ${n}`)
    } catch (e) {
      setStatus(e.message || e.response?.data?.error || 'Failed to start')
    }
  }

  const handleStop = async (name) => {
    try {
      await stop(name)
      setStatus(`Stopped ${name}`)
    } catch (e) {
      setStatus(e.message || e.response?.data?.error || 'Failed to stop')
    }
  }

  const handleScheduleSave = async () => {
    try {
      await saveSched(sched)
      setStatus('Schedule saved')
      runAI(activities, sched, activeSessions.length)
    } catch {
      setStatus('Failed to save schedule')
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all activities?')) return
    await clear()
    setStatus('Cleared')
  }

  const handleManualLog = async () => {
    const name = manualName.trim()
    const duration_hours = parseFloat(manualHours)
    if (!name || !duration_hours || duration_hours <= 0) {
      setStatus('Enter name and hours > 0')
      return
    }
    try {
      await logManual({ name, duration_hours })
      setManualName('')
      setStatus(`Logged ${name} (${duration_hours}h)`)
    } catch (e) {
      setStatus(e.response?.data?.error || 'Failed to log')
    }
  }

  const handleAnalyze = () => {
    setAiThinking(true)
    runAI(activities, sched, activeSessions.length)
    getSummary().then(setSummary)
    setAiThinking(false)
  }

  const handleOptimize = async () => {
    setAiThinking(true)
    const optimized = optimizeSchedule(sched)
    setSchedule(optimized)
    try {
      await saveSched(optimized)
      setAiStatus('AI optimized your 24-hour plan')
      setAiInsights(['Schedule balanced for sleep, work, and recovery.'])
    } finally {
      setAiThinking(false)
    }
  }

  const handleSuggest = () => {
    const pick = suggestActivity()
    const msg = `I suggest ${pick}. Say start ${pick} when you're ready.`
    setAiInsights([msg])
    assistantSay(msg)
  }

  const voiceContext = useCallback(
    () => ({
      activities,
      schedule: sched,
      activeSessions,
      summary,
    }),
    [activities, sched, activeSessions, summary],
  )

  const processVoiceTranscript = useCallback(
    async (transcript) => {
      const intent = parseVoiceIntent(transcript)
      pushChat('user', transcript)
      const ctx = voiceContext()

      try {
        switch (intent.intent) {
          case 'greet':
            assistantSay(spokenForIntent('greet'), { alsoInsight: true })
            break
          case 'help':
            setAiInsights(helpVoiceCommands())
            assistantSay(spokenForIntent('help'), { alsoInsight: true })
            break
          case 'start':
            await start(intent.name)
            assistantSay(spokenForIntent('start', { name: intent.name }))
            break
          case 'stop':
            await stop(intent.name)
            assistantSay(spokenForIntent('stop', { name: intent.name }))
            break
          case 'stop_all':
            await stopAll()
            assistantSay(spokenForIntent('stop_all'))
            break
          case 'pomodoro_start': {
            const r = await pomodoroStart()
            assistantSay(
              spokenForIntent('pomodoro_start', { minutes: r?.minutes || sched.pomodoro_minutes || 25 }),
            )
            break
          }
          case 'pomodoro_stop':
            await pomodoroStop()
            assistantSay(spokenForIntent('pomodoro_stop'))
            break
          case 'summary': {
            const s = await getSummary()
            setSummary(s)
            const msg = `Today you've tracked ${s.total_hours_tracked} hours across ${s.activity_count} activities. ${s.active_count ? `${s.active_count} still running.` : ''}`
            assistantSay(spokenForIntent('summary', { spoken: msg }))
            break
          }
          case 'analyze': {
            runAI(activities, sched, activeSessions.length)
            const chips = buildInsights(activities, sched, activeSessions.length)
            setAiInsights(chips)
            const msg = chips.join(' ')
            assistantSay(spokenForIntent('analyze', { spoken: msg }))
            break
          }
          case 'optimize':
            await handleOptimize()
            assistantSay(spokenForIntent('optimize'))
            break
          case 'suggest': {
            const pick = suggestActivity()
            assistantSay(spokenForIntent('suggest', { pick }))
            setAiInsights([`Next: ${pick}`])
            break
          }
          case 'clear':
            if (confirm('Clear all activities?')) {
              await clear()
              assistantSay(spokenForIntent('clear'))
            }
            break
          case 'plan':
            setActiveTab('plan')
            assistantSay(spokenForIntent('plan'))
            break
          case 'stats':
            setActiveTab('stats')
            assistantSay(spokenForIntent('stats', { spoken: 'Opening your stats. Check goals versus actual on screen.' }))
            break
          case 'chat':
          default: {
            const reply = buildTalkReply(intent.text || transcript, ctx)
            setAiInsights(buildInsights(activities, sched, activeSessions.length))
            assistantSay(reply || buildTalkReply(transcript, ctx))
            break
          }
        }
      } catch (e) {
        const err = e.message || e.response?.data?.error || 'Something went wrong'
        assistantSay(err)
        setStatus(err)
      }
    },
    [
      activities,
      sched,
      activeSessions,
      assistantSay,
      clear,
      getSummary,
      handleOptimize,
      pomodoroStart,
      pomodoroStop,
      pushChat,
      runAI,
      start,
      stop,
      stopAll,
      voiceContext,
    ],
  )

  const handleExport = async () => {
    try {
      const data = await getExport()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-time-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Export ready')
    } catch {
      setStatus('Export failed')
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await exportDownload()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ai-time-export.json'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Downloaded')
    } catch {
      setStatus('Download failed')
    }
  }

  const toggleAssistantVoice = () => {
    if (!speechSupported()) {
      setStatus('Voice not supported — use Chrome or Safari')
      assistantSay('Voice is not supported in this browser. Try Chrome or Edge.')
      return
    }
    if (listening) {
      listeningRef.current = false
      setListening(false)
      recognitionRef.current?.stop()
      stopSpeaking()
      setStatus('Mic off')
      return
    }
    setActiveTab('coach')
    listeningRef.current = true
    setListening(true)
    setStatus('Listening… speak naturally')
    const rec = createRecognizer({
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
          setStatus(`Heard: ${text}`)
          processVoiceTranscript(text)
        }
      },
      onStatus: (s) => {
        if (s === 'listening') setStatus('Listening…')
      },
      onEnd: () => {
        if (listeningRef.current) {
          try {
            rec.start()
          } catch {
            setListening(false)
            listeningRef.current = false
          }
        } else {
          setListening(false)
        }
      },
      onError: (err) => {
        if (err !== 'no-speech' && err !== 'aborted') setStatus(`Voice: ${err}`)
        if (err === 'not-allowed') {
          assistantSay('Please allow microphone access to talk to your assistant.')
          listeningRef.current = false
          setListening(false)
        }
      },
    })
    recognitionRef.current = rec
    rec.start()
  }

  const toggleVoiceSpeak = () => {
    const next = !voiceSpeak
    setVoiceSpeak(next)
    setVoiceSpeakEnabled(next)
    if (!next) stopSpeaking()
    else assistantSay('I will speak my replies aloud.')
  }

  const tabLabel = (tab) => (device === 'phone' ? tab.short : tab.label)

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <p className="hero-kicker">AI Time</p>
          <h1 className="sidebar-title">Talking Time Assistant</h1>
        </div>

        <nav className="side-tabs" role="tablist" aria-label="Sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`side-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="side-tab-label">{tabLabel(tab)}</span>
              {device !== 'phone' && <span className="side-tab-desc">{tab.desc}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="device-tag">{DEVICE_LABELS[device]}</span>
          <span className={`badge ${apiOk ? 'ok' : 'warn'}`}>
            {apiOk === null ? '…' : useLocal ? 'Browser' : 'API'}
          </span>
          <p className="status sidebar-status" role="status">{status}</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="panel-header">
          <h2>{currentTab.label}</h2>
          <p className="panel-sub">{currentTab.desc}</p>
        </header>

        {activeTab === 'coach' && (
          <section className="card tab-panel ai-panel" role="tabpanel" id="panel-coach" aria-labelledby="tab-coach">
            <div className="assistant-hero">
              <button
                type="button"
                className={`assistant-mic ${listening ? 'listening' : ''}`}
                onClick={toggleAssistantVoice}
                aria-label={listening ? 'Stop talking to AI' : 'Talk to AI assistant'}
              >
                <span className="mic-ring" aria-hidden />
                <span className="mic-icon">{listening ? '🎙️' : '🗣️'}</span>
              </button>
              <p className="assistant-prompt">
                {listening
                  ? 'Listening… say start work, how am I doing, or what should I do now'
                  : 'Tap to talk — your AI time coach listens and replies'}
              </p>
              <label className="voice-toggle">
                <input type="checkbox" checked={voiceSpeak} onChange={toggleVoiceSpeak} />
                AI speaks replies aloud
              </label>
            </div>

            <p className={`ai-status ${aiThinking ? 'thinking' : ''}`} aria-live="polite">{aiStatus}</p>

            <ul className="chat-log" aria-label="Conversation with assistant">
              {chatMessages.length ? (
                chatMessages.map((m) => (
                  <li key={m.id} className={`chat-bubble ${m.role}`}>
                    <span className="chat-role">{m.role === 'user' ? 'You' : 'AI'}</span>
                    {m.text}
                  </li>
                ))
              ) : (
                <li className="chat-bubble assistant muted-bubble">
                  <span className="chat-role">AI</span>
                  {getAssistantGreeting()}
                </li>
              )}
            </ul>

            <ul className="ai-chips">
              {aiInsights.length ? aiInsights.map((t, i) => <li key={i}>{t}</li>) : (
                <li>Say &quot;help&quot; to hear voice commands.</li>
              )}
            </ul>
            {summary && (
              <p className="summary-inline">
                Today: {summary.total_hours_tracked}h tracked · {summary.total_hours_planned}h planned
                · {summary.active_count} active
              </p>
            )}
            <div className="ai-actions">
              <button type="button" className="btn-ai" onClick={handleAnalyze}>Analyze day</button>
              <button type="button" className="btn-ai" onClick={handleOptimize}>Optimize schedule</button>
              <button type="button" className="btn-ai" onClick={handleSuggest}>What now?</button>
            </div>
          </section>
        )}

        {activeTab === 'track' && (
          <section className="card tab-panel" role="tabpanel" id="panel-track" aria-labelledby="tab-track">
            <div className="quick-starts">
              {QUICK_STARTS.map((q) => (
                <button key={q} type="button" className="chip-btn" onClick={() => handleStart(q)}>{q}</button>
              ))}
            </div>

            <div className="row">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Activity name"
                aria-label="Activity name"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
              <button type="button" onClick={() => handleStart()}>Start</button>
            </div>

            <div className="row">
              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                aria-label="Hours to log"
                className="hours-input"
              />
              <button type="button" className="btn-secondary" onClick={handleManualLog}>Log past</button>
            </div>

            <div className="pomodoro-bar">
              <button
                type="button"
                className={pomodoroActive ? 'pomodoro on' : 'pomodoro'}
                onClick={() => (pomodoroActive ? pomodoroStop() : pomodoroStart())}
              >
                {pomodoroActive
                  ? `Pomodoro · ${pomodoroLeft ?? '…'} min left`
                  : `Start Pomodoro (${sched.pomodoro_minutes || 25} min)`}
              </button>
            </div>

            <button type="button" className={`mic ${listening ? 'on' : ''}`} onClick={toggleAssistantVoice}>
              {listening ? 'Listening…' : 'Talk to AI'}
            </button>

            <div className="row-actions">
              <button type="button" className="btn-secondary" onClick={() => stopAll().then(() => setStatus('Stopped all'))}>
                Stop all
              </button>
              <button type="button" className="danger" onClick={handleClear}>Clear all</button>
            </div>

            <ul className="list">
              {activeSessions.map((s) => (
                <li key={`a-${s.id}`} className="item active">
                  <span>{s.name}</span>
                  <button type="button" onClick={() => handleStop(s.name)}>Stop</button>
                </li>
              ))}
              {activities.map((a) => (
                <li key={a.id} className="item">
                  <span>{a.name} <small className="cat-tag">{a.category}</small></span>
                  <span className="item-meta">
                    {Number(a.duration_hours).toFixed(2)} h
                    <button type="button" className="btn-icon" onClick={() => removeActivity(a.id)} aria-label="Delete">×</button>
                  </span>
                </li>
              ))}
              {!activities.length && !activeSessions.length && (
                <li className="item muted">No activities yet — start one above</li>
              )}
            </ul>
          </section>
        )}

        {activeTab === 'plan' && (
          <section className="card tab-panel" role="tabpanel" id="panel-plan" aria-labelledby="tab-plan">
            <label className="field full-width">
              Daily note
              <textarea
                rows={3}
                value={sched.daily_note || ''}
                onChange={(e) => setSchedule((s) => ({ ...(s || DEFAULT_SCHEDULE), daily_note: e.target.value }))}
                placeholder="Priorities, meetings, reminders…"
              />
            </label>
            <label className="field pomodoro-field">
              Pomodoro length (minutes)
              <input
                type="number"
                min="5"
                max="90"
                value={sched.pomodoro_minutes ?? 25}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...(s || DEFAULT_SCHEDULE),
                    pomodoro_minutes: parseInt(e.target.value, 10) || 25,
                  }))
                }
              />
            </label>
            <div className="schedule-grid">
              {SCHEDULE_LABELS.map(({ key, label, color }) => (
                <label key={key} className="field">
                  {label} (hours)
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.25"
                    value={sched[key] ?? 0}
                    onChange={(e) =>
                      setSchedule((s) => ({
                        ...(s || DEFAULT_SCHEDULE),
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                  <div
                    className="bar"
                    style={{
                      width: `${((Number(sched[key]) || 0) / 24) * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </label>
              ))}
            </div>
            <button type="button" className="save-schedule" onClick={handleScheduleSave}>Save schedule</button>
            <p className="summary">
              Total planned: {totalPlanned.toFixed(1)} h ({((totalPlanned / 24) * 100).toFixed(1)}% of day)
            </p>
          </section>
        )}

        {activeTab === 'stats' && (
          <section className="card tab-panel" role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
            {summary ? (
              <>
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-val">{summary.total_hours_tracked}</span>
                    <span className="stat-lbl">Hours tracked</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val">{summary.total_hours_planned}</span>
                    <span className="stat-lbl">Hours planned</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val">{summary.activity_count}</span>
                    <span className="stat-lbl">Activities</span>
                  </div>
                </div>
                <h3 className="section-title">Goals vs actual</h3>
                <ul className="goal-list">
                  {SCHEDULE_LABELS.map(({ key, label, color }) => {
                    const row = summary.by_category?.[key] || { actual: 0, goal: 0, diff: 0 }
                    const pct = row.goal ? Math.min(100, (row.actual / row.goal) * 100) : 0
                    return (
                      <li key={key} className="goal-row">
                        <span className="goal-label">{label}</span>
                        <span className="goal-nums">{row.actual}h / {row.goal}h</span>
                        <div className="goal-bar-wrap">
                          <div className="goal-bar" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className={`goal-diff ${row.diff >= 0 ? 'over' : 'under'}`}>
                          {row.diff >= 0 ? '+' : ''}{row.diff}h
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="muted-center">Loading stats…</p>
            )}
            {weekStats?.days?.length > 0 && (
              <>
                <h3 className="section-title">Last 7 days</h3>
                <ul className="week-chart">
                  {weekStats.days.map((d) => (
                    <li key={d.date} className="week-bar-item">
                      <span className="week-date">{d.date.slice(5)}</span>
                      <div className="week-bar-track">
                        <div
                          className="week-bar-fill"
                          style={{ height: `${Math.min(100, (d.total / 12) * 100)}%` }}
                          title={`${d.total}h`}
                        />
                      </div>
                      <span className="week-total">{d.total}h</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {activeTab === 'tools' && (
          <section className="card tab-panel" role="tabpanel" id="panel-tools" aria-labelledby="tab-tools">
            <div className="tools-grid">
              <button type="button" onClick={handleExport}>Copy export (JSON)</button>
              <button type="button" onClick={handleDownload}>Download backup</button>
              <button type="button" className="btn-secondary" onClick={() => getHistory().then(setHistory)}>
                Refresh history
              </button>
            </div>
            <h3 className="section-title">History (last 30 days)</h3>
            <ul className="list history-list">
              {history?.activities?.length ? (
                history.activities.slice(0, 50).map((a) => (
                  <li key={a.id} className="item">
                    <span>{a.activity_date} · {a.name}</span>
                    <span>{Number(a.duration_hours).toFixed(2)} h</span>
                  </li>
                ))
              ) : (
                <li className="item muted">No history yet</li>
              )}
            </ul>
            <p className="api-hint">
              API: health, activities, schedule, summary, stats/week, history, export, pomodoro — port 8100 locally.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
