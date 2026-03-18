import { useState } from 'react'

import { sendMessage } from '../api'
import './MessageOutput.css'

export default function MessageOutput({ result, loading }) {
  const [copied, setCopied] = useState(false)
  const [sendState, setSendState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [sendError, setSendError] = useState(null)

  async function handleCopy() {
    if (!result?.generated_message) return
    await navigator.clipboard.writeText(result.generated_message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSend() {
    if (!result || sendState === 'sending') return
    setSendState('sending')
    setSendError(null)
    try {
      await sendMessage({
        child_name: result.child_name,
        parent_email: result.parent_email,
        classroom: result.classroom,
        event_type: result.event_type,
        generated_message: result.generated_message,
        tone: result.tone,
      })
      setSendState('sent')
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
            <p>Delivered to {result.parent_email}</p>
          </div>
          <span className="send-badge">Placeholder — connect email provider to send for real</span>
        </div>
      )}

      {sendState === 'error' && (
        <div className="send-error" role="alert">
          ⚠️ {sendError}
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
          <button
            className={`btn-send ${sendState === 'sent' ? 'btn-send--sent' : ''}`}
            onClick={handleSend}
            disabled={sendState === 'sending' || sendState === 'sent'}
            aria-label="Send message to parent"
          >
            {sendState === 'sending' && '⏳ Sending…'}
            {sendState === 'sent' && '✓ Sent'}
            {(sendState === 'idle' || sendState === 'error') && '📨 Send to Parent'}
          </button>
        </div>
      </div>
    </div>
  )
}
