import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchReplyContext, submitReply } from '../api'

export default function ReplyPage() {
  const { token } = useParams()
  const [context, setContext] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchReplyContext(token)
      .then(setContext)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      await submitReply(token, replyText)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="reply-page"><p>Loading…</p></div>
  if (error) return <div className="reply-page"><div className="error-banner">⚠️ {error}</div></div>

  if (submitted) {
    return (
      <div className="reply-page">
        <div className="reply-card">
          <div className="reply-success">
            <span>✓</span>
            <h2>Reply Sent</h2>
            <p>Your message has been delivered to {context?.child_name}'s teacher.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reply-page">
      <div className="reply-card">
        <div className="login-header">
          <span className="logo-icon" aria-hidden="true">🌱</span>
          <h1>Reply to Teacher</h1>
          <p>Sunrise Learning Center</p>
        </div>

        <div className="reply-context">
          <p><strong>Regarding:</strong> {context.child_name} — {context.event_type}</p>
          <div className="reply-original-message">{context.original_message}</div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-section">
            <label className="form-label" htmlFor="reply-text">Your Reply</label>
            <textarea
              id="reply-text"
              className="form-input reply-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply here…"
              rows={5}
              required
            />
          </div>
          <button type="submit" className="btn-generate" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      </div>
    </div>
  )
}
