import { useEffect, useState } from 'react'
import { fetchMessages, cancelMessage } from '../api'

const STATUS_LABELS = {
  draft: { label: 'Draft', color: '#6b7280' },
  sent: { label: 'Sent', color: '#16a34a' },
  scheduled: { label: 'Scheduled', color: '#d97706' },
  failed: { label: 'Failed', color: '#dc2626' },
  cancelled: { label: 'Cancelled', color: '#9ca3af' },
}

export default function MessageHistory({ onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchMessages()
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCancel(id) {
    try {
      await cancelMessage(id)
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'cancelled' } : m))
      )
    } catch (err) {
      alert('Failed to cancel: ' + err.message)
    }
  }

  if (loading) return <div className="history-loading">Loading message history…</div>
  if (error) return <div className="error-banner">⚠️ {error}</div>

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>Message History</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close history">✕</button>
      </div>
      {messages.length === 0 ? (
        <p className="history-empty">No messages yet. Generate and send your first message!</p>
      ) : (
        <div className="history-list">
          {messages.map((msg) => {
            const s = STATUS_LABELS[msg.status] || { label: msg.status, color: '#6b7280' }
            const isExpanded = expanded === msg.id
            return (
              <div key={msg.id} className="history-item">
                <div className="history-item-header" onClick={() => setExpanded(isExpanded ? null : msg.id)}>
                  <div className="history-item-meta">
                    <strong>{msg.child_name}</strong>
                    <span className="meta-tag meta-tag--blue">{msg.classroom}</span>
                    <span className="meta-tag">{msg.event_type}</span>
                    {msg.unread_replies > 0 && (
                      <span className="reply-badge">{msg.unread_replies} new reply</span>
                    )}
                  </div>
                  <div className="history-item-right">
                    <span className="status-badge" style={{ background: s.color }}>{s.label}</span>
                    {msg.scheduled_for && (
                      <span className="schedule-info">📅 {new Date(msg.scheduled_for).toLocaleString()}</span>
                    )}
                    <span className="history-date">{new Date(msg.created_at).toLocaleDateString()}</span>
                    <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="history-item-body">
                    <p className="history-message-text">{msg.generated_message}</p>
                    <p className="history-recipient">To: {msg.parent_email}</p>
                    {msg.status === 'scheduled' && (
                      <button
                        className="btn-cancel"
                        onClick={() => handleCancel(msg.id)}
                      >
                        Cancel Scheduled Send
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
