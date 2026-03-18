import { useEffect, useState } from 'react'

import ChildSelector from './components/ChildSelector'
import EventForm from './components/EventForm'
import MessageOutput from './components/MessageOutput'
import ToneSelector from './components/ToneSelector'
import { fetchChildren, fetchEventTypes, generateMessage } from './api'
import './App.css'

export default function App() {
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

  useEffect(() => {
    Promise.all([fetchChildren(), fetchEventTypes()])
      .then(([kids, events]) => {
        setChildren(kids)
        setEventTypes(events)
      })
      .catch((err) => setDataError(err.message))
  }, [])

  const canGenerate = selectedChild !== null && selectedEventType !== null

  async function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
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

  function handleEventTypeSelect(et) {
    setSelectedEventType(et)
    setFormData({})
    setResult(null)
    setError(null)
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
        </div>
      </header>

      <main className="app-main">
        {dataError && (
          <div className="error-banner" role="alert">
            ⚠️ Could not load data: {dataError}. Make sure the backend is running on port 8000.
          </div>
        )}

        <div className="dashboard-grid">
          <section className="card compose-panel" aria-label="Compose message">
            <h2 className="card-title">Compose Message</h2>

            <div className="form-section">
              <label className="form-label" htmlFor="child-search">Child</label>
              <ChildSelector
                children={children}
                selected={selectedChild}
                onChange={setSelectedChild}
              />
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
              <EventForm
                eventType={selectedEventType}
                formData={formData}
                onChange={setFormData}
              />
            )}

            <div className="form-section">
              <span className="form-label">Tone</span>
              <ToneSelector tone={tone} onChange={setTone} />
            </div>

            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              aria-label="Generate message"
            >
              {loading ? 'Generating…' : '✨ Generate Message'}
            </button>
          </section>

          <section className="card output-panel" aria-label="Generated message">
            <h2 className="card-title">Generated Message</h2>
            {error && (
              <div className="error-banner" role="alert">
                ⚠️ {error}
              </div>
            )}
            <MessageOutput result={result} loading={loading} />
          </section>
        </div>
      </main>
    </div>
  )
}
