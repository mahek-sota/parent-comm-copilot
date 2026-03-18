import { useState } from 'react'
import { bulkSend } from '../api'

export default function BulkMessageReview({ results, onDone }) {
  const [approved, setApproved] = useState(
    () => new Set(results.map((r) => r.message_id))
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  function toggleApprove(messageId) {
    setApproved((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  async function handleSendAll() {
    const ids = results.filter((r) => approved.has(r.message_id)).map((r) => r.message_id)
    if (ids.length === 0) return
    setSending(true)
    try {
      const res = await bulkSend(ids)
      setSendResult(res)
      setSent(true)
    } catch (err) {
      alert('Send failed: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent && sendResult) {
    return (
      <div className="bulk-result">
        <h3>Bulk Send Complete</h3>
        <p>✓ {sendResult.sent} sent successfully</p>
        {sendResult.failed > 0 && <p>✗ {sendResult.failed} failed</p>}
        <button className="btn-generate" onClick={onDone}>Done</button>
      </div>
    )
  }

  return (
    <div className="bulk-review">
      <div className="bulk-review-header">
        <h3>Review Generated Messages ({results.length})</h3>
        <p className="bulk-review-hint">Uncheck any messages you don't want to send.</p>
      </div>
      <div className="bulk-review-list">
        {results.map((r) => (
          <div key={r.message_id} className={`bulk-review-item ${!approved.has(r.message_id) ? 'bulk-review-item--disabled' : ''}`}>
            <div className="bulk-review-item-header">
              <label className="bulk-approve-label">
                <input
                  type="checkbox"
                  checked={approved.has(r.message_id)}
                  onChange={() => toggleApprove(r.message_id)}
                />
                <strong>{r.child_name}</strong>
                <span className="meta-tag meta-tag--blue">{r.classroom}</span>
              </label>
              <span className="bulk-recipient">{r.parent_email}</span>
            </div>
            <p className="bulk-message-preview">{r.generated_message}</p>
          </div>
        ))}
      </div>
      <div className="bulk-review-footer">
        <span>{approved.size} of {results.length} approved</span>
        <button
          className="btn-generate"
          onClick={handleSendAll}
          disabled={sending || approved.size === 0}
        >
          {sending ? 'Sending…' : `Send ${approved.size} Messages`}
        </button>
      </div>
    </div>
  )
}
