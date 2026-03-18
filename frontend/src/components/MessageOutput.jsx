import { useState } from 'react'
import { sendMessage } from '../api'
import './MessageOutput.css'

export default function MessageOutput({ result, loading }) {
  const [copied, setCopied] = useState(false)
  const [sendState, setSendState] = useState('idle')
  const [sendError, setSendError] = useState(null)
  const [scheduledFor, setScheduledFor] = useState('')
  const [showScheduler, setShowScheduler] = useState(false)

  async function handleCopy() {
    if (!result?.generated_message) return
    await navigator.clipboard.writeText(result.generated_message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSend(scheduled = false) {
    if (!result || sendState === 'sending') return
    setSendState('sending')
    setSendError(null)
    try {
      const payload = { message_id: result.message_id }
      if (scheduled && scheduledFor) {
        payload.scheduled_for = new Date(scheduledFor).toISOString()
      }
      const res = await sendMessage(payload)
      setSendState(res.status === 'scheduled' ? 'scheduled' : 'sent')
    } catch (err) {
      setSendError(err.message)
      setSendState('error')
    }
  }

  if (loading) {
    return (
      <div className="message-skeleton" aria-label="Generating message" aria-busy="true">
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--medium" />
        <div className="skeleton-line skeleton-line--long" />
        <div className="skeleton-line skeleton-line--medium" />
        <div className="skeleton-line skeleton-line--short" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="message-empty">
        <div className="message-empty-icon" aria-hidden="true">✉️</div>
        <p>Your generated message will appear here.</p>
        <p className="message-hint">Select a child and event type to get started.</p>
      </div>
    )
  }

  return (
    <div className="message-result">
      <div className="message-meta">
        <span className="meta-tag">{result.child_name}</span>
        <span className="meta-tag meta-tag--blue">{result.classroom}</span>
        <span className="meta-tag meta-tag--gray">{result.tone}</span>
      </div>

      <div className="message-body" role="region" aria-label="Generated message text">
        {result.generated_message}
      </div>

      {sendState === 'sent' && (
        <div className="send-success" role="status">
          <span className="send-success-icon">✓</span>
          <div>
            <strong>Message sent</strong>
            <p>Logged for {result.parent_email}</p>
          </div>
          <span className="demo-badge">Demo mode · Email delivery is future scope</span>
        </div>
      )}

      {sendState === 'scheduled' && (
        <div className="send-success" role="status">
          <span className="send-success-icon">📅</span>
          <div>
            <strong>Message scheduled</strong>
            <p>Will be delivered to {result.parent_email} at the scheduled time</p>
          </div>
          <span className="demo-badge">Demo mode · Email delivery is future scope</span>
        </div>
      )}

      {sendState === 'error' && (
        <div className="send-error" role="alert">⚠️ {sendError}</div>
      )}

      {showScheduler && sendState === 'idle' && (
        <div className="scheduler-row">
          <input
            type="datetime-local"
            className="form-input scheduler-input"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <button
            className="btn-schedule"
            onClick={() => handleSend(true)}
            disabled={!scheduledFor || sendState === 'sending'}
          >
            Confirm Schedule
          </button>
          <button className="btn-cancel-schedule" onClick={() => setShowScheduler(false)}>Cancel</button>
        </div>
      )}

      <div className="message-footer">
        <span className="message-to">To: {result.parent_email}</span>
        <div className="message-actions">
          <button
            className={`btn-copy ${copied ? 'btn-copy--success' : ''}`}
            onClick={handleCopy}
            aria-label="Copy message"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          {sendState === 'idle' || sendState === 'error' ? (
            <>
              <button
                className="btn-send"
                onClick={() => handleSend(false)}
                disabled={sendState === 'sending'}
                aria-label="Send message to parent"
              >
                {sendState === 'sending' ? '⏳ Sending…' : '📨 Send Now'}
              </button>
              <button
                className="btn-schedule-toggle"
                onClick={() => setShowScheduler((v) => !v)}
                disabled={sendState === 'sending'}
              >
                📅 Schedule
              </button>
            </>
          ) : (
            <button className="btn-send btn-send--sent" disabled>
              {sendState === 'scheduled' ? '📅 Scheduled' : '✓ Sent'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
