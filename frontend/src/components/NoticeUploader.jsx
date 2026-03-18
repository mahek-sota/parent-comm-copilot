import { useRef, useState } from 'react'
import { uploadNotices, sendNotices, getNoticeSampleUrl } from '../api'
import './NoticeUploader.css'

export default function NoticeUploader({ onClose }) {
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sendState, setSendState] = useState('idle') // 'idle' | 'sending' | 'done' | 'error'
  const [sendResult, setSendResult] = useState(null)
  const [sendError, setSendError] = useState(null)

  async function processFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a .csv file')
      return
    }
    setUploading(true)
    setUploadError(null)
    setPreview(null)
    setSendState('idle')
    setSendResult(null)
    try {
      const data = await uploadNotices(file)
      setPreview(data)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e) {
    processFile(e.target.files[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  async function handleSend() {
    if (!preview) return
    const matchedRows = preview.rows.filter((r) => r.status === 'matched')
    if (matchedRows.length === 0) return
    setSendState('sending')
    setSendError(null)
    try {
      const result = await sendNotices(matchedRows)
      setSendResult(result)
      setSendState('done')
    } catch (err) {
      setSendError(err.message)
      setSendState('error')
    }
  }

  function handleReset() {
    setPreview(null)
    setUploadError(null)
    setSendState('idle')
    setSendResult(null)
    setSendError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const matchedRows = preview?.rows.filter((r) => r.status === 'matched') ?? []
  const unmatchedRows = preview?.rows.filter((r) => r.status !== 'matched') ?? []

  return (
    <div className="notice-panel card">
      <div className="notice-header">
        <h2 className="card-title">📢 CSV Notice Broadcast</h2>
        <button className="notice-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <p className="notice-description">
        Upload a CSV to send notices to individual children, entire classrooms, or all families at once.{' '}
        <a href={getNoticeSampleUrl()} download="notices_template.csv" className="notice-sample-link">
          Download sample CSV
        </a>
      </p>

      {!preview && (
        <div
          className={`notice-dropzone ${dragging ? 'notice-dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload CSV file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="notice-file-input"
            onChange={handleFileChange}
          />
          {uploading ? (
            <span className="notice-dropzone-text">Parsing CSV…</span>
          ) : (
            <>
              <span className="notice-dropzone-icon">📁</span>
              <span className="notice-dropzone-text">Drop your CSV here or click to browse</span>
              <span className="notice-dropzone-hint">Columns: child_name, subject, message</span>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <div className="notice-error" role="alert">⚠️ {uploadError}</div>
      )}

      {preview && sendState !== 'done' && (
        <>
          <div className="notice-summary">
            <span className="notice-summary-item notice-summary-item--green">
              ✓ {matchedRows.length} row{matchedRows.length !== 1 ? 's' : ''} matched
            </span>
            <span className="notice-summary-item notice-summary-item--blue">
              {preview.total_recipients} recipient{preview.total_recipients !== 1 ? 's' : ''}
            </span>
            {preview.unmatched_count > 0 && (
              <span className="notice-summary-item notice-summary-item--red">
                ⚠️ {preview.unmatched_count} unmatched
              </span>
            )}
          </div>

          <div className="notice-table-wrap">
            <table className="notice-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Target</th>
                  <th>Subject</th>
                  <th>Recipients</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.row_number} className={`notice-row notice-row--${row.status}`}>
                    <td className="notice-cell-num">{row.row_number}</td>
                    <td className="notice-cell-target">{row.raw_target}</td>
                    <td className="notice-cell-subject">{row.subject || <em className="notice-na">—</em>}</td>
                    <td className="notice-cell-recipients">
                      {row.status === 'matched'
                        ? row.matched_children.map((c) => c.child_name).join(', ')
                        : <em className="notice-na">—</em>}
                    </td>
                    <td className="notice-cell-status">
                      {row.status === 'matched' && (
                        <span className="notice-badge notice-badge--green">
                          {row.matched_children.length} matched
                        </span>
                      )}
                      {row.status === 'unmatched' && (
                        <span className="notice-badge notice-badge--red" title={row.error}>
                          unmatched
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="notice-badge notice-badge--gray" title={row.error}>
                          error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sendState === 'error' && (
            <div className="notice-error" role="alert">⚠️ {sendError}</div>
          )}

          <div className="notice-actions">
            <button className="btn-notice-reset" onClick={handleReset}>
              ↩ Upload Different File
            </button>
            <button
              className="btn-notice-send"
              onClick={handleSend}
              disabled={matchedRows.length === 0 || sendState === 'sending'}
            >
              {sendState === 'sending'
                ? '⏳ Sending…'
                : `📨 Send to ${preview.total_recipients} Recipient${preview.total_recipients !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {sendState === 'done' && sendResult && (
        <div className="notice-send-success">
          <div className="notice-send-success-header">
            <span className="notice-send-success-icon">✓</span>
            <div>
              <strong>{sendResult.sent} notice{sendResult.sent !== 1 ? 's' : ''} sent</strong>
              {sendResult.skipped > 0 && (
                <p>{sendResult.skipped} row{sendResult.skipped !== 1 ? 's' : ''} skipped (unmatched)</p>
              )}
            </div>
            <span className="demo-badge">Demo mode · Email delivery is future scope</span>
          </div>

          <div className="notice-sent-list">
            {sendResult.details.map((d, i) => (
              <div key={i} className="notice-sent-item">
                <span className="notice-sent-child">{d.child_name}</span>
                <span className="notice-sent-email">{d.parent_email}</span>
                <span className="notice-sent-subject">{d.subject}</span>
              </div>
            ))}
          </div>

          <button className="btn-notice-reset" onClick={handleReset} style={{ marginTop: 16 }}>
            ↩ Upload Another File
          </button>
        </div>
      )}
    </div>
  )
}
