import { useState } from 'react'
import { login } from '../api'

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(email, password)
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <span className="logo-icon" aria-hidden="true">🌱</span>
          <h1>Parent Communication Copilot</h1>
          <p>Sunrise Learning Center</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-section">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@sunrisecenter.edu"
              required
              autoFocus
            />
          </div>
          <div className="form-section">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          {error && (
            <div className="error-banner" role="alert">⚠️ {error}</div>
          )}
          <button type="submit" className="btn-generate" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="login-hint">
          Demo credentials: l.rivera@sunrisecenter.edu / rivera2025
        </p>
      </div>
    </div>
  )
}
