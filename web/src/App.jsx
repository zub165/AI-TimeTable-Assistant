import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildInsights, detectDevice, optimizeSchedule, suggestActivity } from './ai'
import { useTimeData } from './hooks/useTimeData'
import './App.css'

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

const SCHEDULE_LABELS = [
  { key: 'sleep', label: 'Sleep', color: '#4895ef' },
  { key: 'work', label: 'Work', color: '#4361ee' },
  { key: 'eat', label: 'Eating', color: '#4cc9f0' },
  { key: 'exercise', label: 'Exercise', color: '#f72585' },
  { key: 'prayer', label: 'Prayer', color: '#2a9d8f' },
  { key: 'read', label: 'Reading', color: '#3a0ca3' },
  { key: 'entertainment', label: 'Entertainment', color: '#7209b7' },
]

const TABS = [
  { id: 'coach', label: 'AI Coach', short: 'Coach', desc: 'Insights & schedule AI' },
  { id: 'track', label: 'Track', short: 'Track', desc: 'Voice & activities' },
  { id: 'plan', label: 'Plan day', short: 'Plan', desc: 'Daily time blocks' },
]

const DEVICE_LABELS = {
  phone: 'iPhone / Phone',
  tablet: 'iPad / Tablet',
  tv: 'Smart TV',
  desktop: 'Desktop',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('coach')
  const [manualName, setManualName] = useState('')
  const [listening, setListening] = useState(false)
  const [device, setDevice] = useState('desktop')
  const [aiInsights, setAiInsights] = useState([])
  const [aiStatus, setAiStatus] = useState('AI is ready to coach your day')
  const [aiThinking, setAiThinking] = useState(false)

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
    saveSched,
    clear,
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
    document.title = 'AI Time — Voice Time Manager'
  }, [device])

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

  const handleAnalyze = () => {
    setAiThinking(true)
    runAI(activities, sched, activeSessions.length)
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
    setAiStatus(`Try: "${pick}"`)
    setAiInsights([`Say or tap Start, then type "${pick}" to track it.`])
  }

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('Speech recognition not supported in this browser')
      return
    }
    if (listening) {
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.onresult = (event) => {
      const text = event.results[0][0].transcript.toLowerCase()
      setStatus(`Heard: ${text}`)
      if (text.includes('start')) {
        const name = text.split('start')[1]?.trim()
        if (name) handleStart(name)
      } else if (text.includes('stop')) {
        const name = text.split('stop')[1]?.trim()
        if (name) handleStop(name)
      } else if (text.includes('analyze') || text.includes('advice')) {
        setActiveTab('coach')
        handleAnalyze()
      } else if (text.includes('optimize')) {
        setActiveTab('coach')
        handleOptimize()
      } else if (text.includes('what should') || text.includes('what now')) {
        setActiveTab('coach')
        handleSuggest()
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    setListening(true)
    setStatus('Listening…')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <p className="hero-kicker">AI Time</p>
          <h1 className="sidebar-title">Voice Time Manager</h1>
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
              <span className="side-tab-label">{tab.label}</span>
              <span className="side-tab-desc">{tab.desc}</span>
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
          <section
            className="card tab-panel ai-panel"
            role="tabpanel"
            id="panel-coach"
            aria-labelledby="tab-coach"
          >
            <p className={`ai-status ${aiThinking ? 'thinking' : ''}`}>{aiStatus}</p>
            <ul className="ai-chips">
              {aiInsights.length ? (
                aiInsights.map((t, i) => <li key={i}>{t}</li>)
              ) : (
                <li>Tap Analyze day for personalized tips.</li>
              )}
            </ul>
            <div className="ai-actions">
              <button type="button" className="btn-ai" onClick={handleAnalyze}>Analyze day</button>
              <button type="button" className="btn-ai" onClick={handleOptimize}>Optimize schedule</button>
              <button type="button" className="btn-ai" onClick={handleSuggest}>What now?</button>
            </div>
          </section>
        )}

        {activeTab === 'track' && (
          <section
            className="card tab-panel"
            role="tabpanel"
            id="panel-track"
            aria-labelledby="tab-track"
          >
            <div className="row">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. coding, prayer, exercise"
                aria-label="Activity name"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
              <button type="button" onClick={() => handleStart()}>Start</button>
            </div>
            <button
              type="button"
              className={`mic ${listening ? 'on' : ''}`}
              onClick={toggleVoice}
              aria-label="Voice command"
            >
              {listening ? 'Listening…' : 'Voice command'}
            </button>
            <button type="button" className="danger" onClick={handleClear}>Clear all</button>

            <ul className="list">
              {activeSessions.map((s) => (
                <li key={`a-${s.id}`} className="item active">
                  <span>{s.name}</span>
                  <button type="button" onClick={() => handleStop(s.name)}>Stop</button>
                </li>
              ))}
              {activities.map((a) => (
                <li key={a.id} className="item">
                  <span>{a.name}</span>
                  <span>{Number(a.duration_hours).toFixed(2)} h</span>
                </li>
              ))}
              {!activities.length && !activeSessions.length && (
                <li className="item muted">No activities yet — start one above</li>
              )}
            </ul>
          </section>
        )}

        {activeTab === 'plan' && (
          <section
            className="card tab-panel"
            role="tabpanel"
            id="panel-plan"
            aria-labelledby="tab-plan"
          >
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
            <button type="button" className="save-schedule" onClick={handleScheduleSave}>
              Save schedule
            </button>
            <p className="summary">
              Total planned: {totalPlanned.toFixed(1)} h ({((totalPlanned / 24) * 100).toFixed(1)}% of day)
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
