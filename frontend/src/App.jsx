import { useEffect, useState } from 'react'

import ChildSelector from './components/ChildSelector'
import EventForm from './components/EventForm'
import MessageOutput from './components/MessageOutput'
import ToneSelector from './components/ToneSelector'
import LoginForm from './components/LoginForm'
import MessageHistory from './components/MessageHistory'
import BulkChildSelector from './components/BulkChildSelector'
import BulkMessageReview from './components/BulkMessageReview'
import ReplyInbox from './components/ReplyInbox'
import NoticeUploader from './components/NoticeUploader'
import { fetchChildren, fetchEventTypes, generateMessage, bulkGenerate, getStoredUser, logout, fetchReplies } from './api'
import './App.css'

export default function App() {
  const [user, setUser] = useState(() => getStoredUser())
  const [children, setChildren] = useState([])
  const [eventTypes, setEventTypes] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [selectedEventType, setSelectedEventType] = useState(null)
  const [tone, setTone] = useState('friendly')
  const [formData, setFormData] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dataError, setDataError] = useState(null)
  const [activePanel, setActivePanel] = useState(null) // 'history' | 'inbox' | 'notices' | null
  const [mode, setMode] = useState('single') // 'single' | 'bulk'
  const [bulkSelected, setBulkSelected] = useState([])
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchChildren(), fetchEventTypes()])
      .then(([kids, events]) => {
        setChildren(kids)
        setEventTypes(events)
      })
      .catch((err) => setDataError(err.message))
  }, [user])

  useEffect(() => {
    if (!user) return
    const checkReplies = () => {
      fetchReplies(true)
        .then((replies) => setUnreadCount(replies.length))
        .catch(() => {})
    }
    checkReplies()
    const interval = setInterval(checkReplies, 60000)
    return () => clearInterval(interval)
  }, [user])

  function handleLogin(data) {
    setUser({ teacher_id: data.teacher_id, name: data.name })
  }

  function handleLogout() {
    logout()
    setUser(null)
    setResult(null)
    setChildren([])
  }

  const canGenerate = selectedChild !== null && selectedEventType !== null

  async function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const payload = {
        child_id: selectedChild.child_id,
        event_type: selectedEventType.event_type,
        tone,
        time_of_event: formData.time_of_event || now,
        notes: formData.notes || 'No additional notes.',
        injury_description: formData.injury_description || null,
        action_taken: formData.action_taken || null,
      }
      const data = await generateMessage(payload)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkGenerate() {
    if (bulkSelected.length === 0 || !selectedEventType) return
    setBulkLoading(true)
    setBulkResults(null)
    try {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const payload = {
        child_ids: bulkSelected.map((c) => c.child_id),
        event_type: selectedEventType.event_type,
        tone,
        time_of_event: formData.time_of_event || now,
        notes: formData.notes || 'No additional notes.',
        injury_description: formData.injury_description || null,
        action_taken: formData.action_taken || null,
      }
      const res = await bulkGenerate(payload)
      setBulkResults(res.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  function handleEventTypeSelect(et) {
    setSelectedEventType(et)
    setFormData({})
    setResult(null)
    setBulkResults(null)
    setError(null)
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-icon" aria-hidden="true">🌱</span>
            <div>
              <h1>Parent Communication Copilot</h1>
              <p>Sunrise Learning Center</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className={`header-btn ${mode === 'bulk' ? 'header-btn--active' : ''}`}
              onClick={() => { setMode(mode === 'bulk' ? 'single' : 'bulk'); setBulkResults(null) }}
            >
              {mode === 'bulk' ? '👤 Single' : '👥 Bulk'}
            </button>
            <button
              className="header-btn"
              onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
            >
              📋 History
            </button>
            <button
              className="header-btn"
              onClick={() => setActivePanel(activePanel === 'inbox' ? null : 'inbox')}
            >
              💬 Replies {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            <button
              className={`header-btn ${activePanel === 'notices' ? 'header-btn--active' : ''}`}
              onClick={() => setActivePanel(activePanel === 'notices' ? null : 'notices')}
            >
              📢 Notices
            </button>
            <span className="header-user">👤 {user.name}</span>
            <button className="header-btn header-btn--logout" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {dataError && (
          <div className="error-banner" role="alert">
            ⚠️ Could not load data: {dataError}. Make sure the backend is running on port 8000.
          </div>
        )}

        {activePanel === 'history' && (
          <MessageHistory onClose={() => setActivePanel(null)} />
        )}

        {activePanel === 'inbox' && (
          <ReplyInbox onClose={() => setActivePanel(null)} />
        )}

        {activePanel === 'notices' && (
          <NoticeUploader onClose={() => setActivePanel(null)} />
        )}

        {!activePanel && (
          <div className="dashboard-grid">
            <section className="card compose-panel" aria-label="Compose message">
              <h2 className="card-title">
                {mode === 'bulk' ? '👥 Bulk Message' : 'Compose Message'}
              </h2>

              <div className="form-section">
                <label className="form-label">
                  {mode === 'bulk' ? 'Select Children' : 'Child'}
                </label>
                {mode === 'single' ? (
                  <ChildSelector children={children} selected={selectedChild} onChange={setSelectedChild} />
                ) : (
                  <BulkChildSelector children={children} selected={bulkSelected} onChange={setBulkSelected} />
                )}
              </div>

              <div className="form-section">
                <span className="form-label">Event Type</span>
                <div className="event-type-pills" role="group" aria-label="Event type">
                  {eventTypes.map((et) => (
                    <button
                      key={et.event_type}
                      className={`pill ${selectedEventType?.event_type === et.event_type ? 'pill--active' : ''}`}
                      onClick={() => handleEventTypeSelect(et)}
                      aria-pressed={selectedEventType?.event_type === et.event_type}
                    >
                      {et.display_name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedEventType && (
                <EventForm eventType={selectedEventType} formData={formData} onChange={setFormData} />
              )}

              <div className="form-section">
                <span className="form-label">Tone</span>
                <ToneSelector tone={tone} onChange={setTone} />
              </div>

              {mode === 'single' ? (
                <button
                  className="btn-generate"
                  onClick={handleGenerate}
                  disabled={!canGenerate || loading}
                  aria-label="Generate message"
                >
                  {loading ? 'Generating…' : '✨ Generate Message'}
                </button>
              ) : (
                <button
                  className="btn-generate"
                  onClick={handleBulkGenerate}
                  disabled={bulkSelected.length === 0 || !selectedEventType || bulkLoading}
                >
                  {bulkLoading ? 'Generating…' : `✨ Generate for ${bulkSelected.length} Children`}
                </button>
              )}
            </section>

            <section className="card output-panel" aria-label="Generated message">
              <h2 className="card-title">
                {mode === 'bulk' ? 'Review & Send' : 'Generated Message'}
              </h2>
              {error && <div className="error-banner" role="alert">⚠️ {error}</div>}

              {mode === 'single' ? (
                <MessageOutput result={result} loading={loading} />
              ) : bulkResults ? (
                <BulkMessageReview results={bulkResults} onDone={() => setBulkResults(null)} />
              ) : (
                <div className="message-empty">
                  <div className="message-empty-icon" aria-hidden="true">👥</div>
                  <p>Select children and an event type, then generate messages for all of them at once.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
