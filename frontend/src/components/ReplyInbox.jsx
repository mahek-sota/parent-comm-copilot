import { useEffect, useState } from 'react'
import { fetchReplies, markReplyRead } from '../api'

export default function ReplyInbox({ onClose }) {
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchReplies()
      .then(setReplies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleMarkRead(replyId) {
    try {
      await markReplyRead(replyId)
      setReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, is_read: true } : r))
      )
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  if (loading) return <div className="history-loading">Loading replies…</div>
  if (error) return <div className="error-banner">⚠️ {error}</div>

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>Parent Replies</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close inbox">✕</button>
      </div>
      {replies.length === 0 ? (
        <p className="history-empty">No parent replies yet.</p>
      ) : (
        <div className="history-list">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`history-item ${!reply.is_read ? 'history-item--unread' : ''}`}
            >
              <div className="history-item-header">
                <div className="history-item-meta">
                  <strong>{reply.child_name}</strong>
                  <span className="meta-tag">{reply.parent_email}</span>
                  {!reply.is_read && <span className="unread-dot" />}
                </div>
                <span className="history-date">
                  {new Date(reply.replied_at).toLocaleString()}
                </span>
              </div>
              <p className="history-message-text">{reply.reply_text}</p>
              {!reply.is_read && (
                <button
                  className="btn-mark-read"
                  onClick={() => handleMarkRead(reply.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
