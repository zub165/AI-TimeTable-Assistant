import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  checkHealth,
  clearActivities,
  fetchActivities,
  fetchSchedule,
  saveSchedule,
  startActivity,
  stopActivity,
} from './api'
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

export default function App() {
  const [apiOk, setApiOk] = useState(null)
  const [activities, setActivities] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [status, setStatus] = useState('Loading…')
  const [manualName, setManualName] = useState('')
  const [listening, setListening] = useState(false)

  const load = useCallback(async () => {
    try {
      await checkHealth()
      setApiOk(true)
      const [act, sched] = await Promise.all([fetchActivities(), fetchSchedule()])
      setActivities(act.activities || [])
      setActiveSessions(act.active_sessions || [])
      setSchedule({ ...DEFAULT_SCHEDULE, ...sched })
      setStatus('Connected to API')
    } catch {
      setApiOk(false)
      setStatus('API offline — start backend on port 8100')
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [load])

  const totalPlanned = useMemo(
    () => SCHEDULE_LABELS.reduce((s, { key }) => s + (Number(schedule[key]) || 0), 0),
    [schedule],
  )

  const handleStart = async (name) => {
    const n = (name || manualName).trim()
    if (!n) return
    try {
      await startActivity(n)
      setManualName('')
      setStatus(`Started ${n}`)
      await load()
    } catch (e) {
      setStatus(e.response?.data?.error || 'Failed to start')
    }
  }

  const handleStop = async (name) => {
    try {
      await stopActivity(name)
      setStatus(`Stopped ${name}`)
      await load()
    } catch (e) {
      setStatus(e.response?.data?.error || 'Failed to stop')
    }
  }

  const handleScheduleSave = async () => {
    try {
      await saveSchedule(schedule)
      setStatus('Schedule saved')
    } catch {
      setStatus('Failed to save schedule')
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all activities?')) return
    await clearActivities()
    await load()
    setStatus('Cleared')
  }

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('Speech recognition not supported')
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
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    setListening(true)
    setStatus('Listening…')
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Voice Time Manager</h1>
        <p className={`badge ${apiOk ? 'ok' : 'err'}`}>
          {apiOk === null ? '…' : apiOk ? 'API online' : 'API offline'}
        </p>
        <p className="status" role="status">{status}</p>
      </header>

      <div className="grid">
        <section className="card">
          <h2>Track activities</h2>
          <div className="row">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Activity name"
              aria-label="Activity name"
            />
            <button type="button" onClick={() => handleStart()}>Start</button>
          </div>
          <button
            type="button"
            className={`mic ${listening ? 'on' : ''}`}
            onClick={toggleVoice}
            aria-label="Voice command"
          >
            🎤 {listening ? 'Listening…' : 'Voice'}
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
                <span>{a.duration_hours.toFixed(2)} h</span>
              </li>
            ))}
            {!activities.length && !activeSessions.length && (
              <li className="item muted">No activities yet</li>
            )}
          </ul>
        </section>

        <section className="card">
          <h2>Plan your day</h2>
          {SCHEDULE_LABELS.map(({ key, label, color }) => (
            <label key={key} className="field">
              {label} (hours)
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                value={schedule[key]}
                onChange={(e) =>
                  setSchedule((s) => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))
                }
              />
              <div
                className="bar"
                style={{
                  width: `${((Number(schedule[key]) || 0) / 24) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </label>
          ))}
          <button type="button" onClick={handleScheduleSave}>Save schedule</button>
          <p className="summary">
            Total planned: {totalPlanned.toFixed(1)} h ({((totalPlanned / 24) * 100).toFixed(1)}% of day)
          </p>
        </section>
      </div>
    </div>
  )
}
