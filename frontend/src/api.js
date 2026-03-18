const BASE_URL = 'http://localhost:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

export function getStoredUser() {
  const raw = localStorage.getItem('auth_user')
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Invalid email or password')
  }
  const data = await res.json()
  localStorage.setItem('auth_token', data.access_token)
  localStorage.setItem('auth_user', JSON.stringify({ teacher_id: data.teacher_id, name: data.name }))
  return data
}

export async function fetchChildren() {
  const res = await fetch(`${BASE_URL}/children`)
  if (!res.ok) throw new Error('Failed to load children')
  return res.json()
}

export async function fetchClassrooms() {
  const res = await fetch(`${BASE_URL}/classrooms`)
  if (!res.ok) throw new Error('Failed to load classrooms')
  return res.json()
}

export async function fetchEventTypes() {
  const res = await fetch(`${BASE_URL}/events`)
  if (!res.ok) throw new Error('Failed to load event types')
  return res.json()
}

export async function generateMessage(payload) {
  const res = await fetch(`${BASE_URL}/generate-message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to generate message')
  }
  return res.json()
}

export async function sendMessage(payload) {
  const res = await fetch(`${BASE_URL}/send-message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to send message')
  }
  return res.json()
}

export async function fetchMessages(childId = null) {
  const url = childId
    ? `${BASE_URL}/messages?child_id=${childId}`
    : `${BASE_URL}/messages`
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to load message history')
  return res.json()
}

export async function bulkGenerate(payload) {
  const res = await fetch(`${BASE_URL}/bulk/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Bulk generate failed')
  }
  return res.json()
}

export async function bulkSend(messageIds) {
  const res = await fetch(`${BASE_URL}/bulk/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message_ids: messageIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Bulk send failed')
  }
  return res.json()
}

export async function fetchReplies(unreadOnly = false) {
  const url = unreadOnly
    ? `${BASE_URL}/replies?unread_only=true`
    : `${BASE_URL}/replies`
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('Failed to load replies')
  return res.json()
}

export async function markReplyRead(replyId) {
  const res = await fetch(`${BASE_URL}/replies/${replyId}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to mark reply as read')
  return res.json()
}

export async function fetchReplyContext(token) {
  const res = await fetch(`${BASE_URL}/reply/${token}`)
  if (!res.ok) throw new Error('Reply link not found or expired')
  return res.json()
}

export async function submitReply(token, replyText) {
  const res = await fetch(`${BASE_URL}/reply/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply_text: replyText }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to submit reply')
  }
  return res.json()
}

export async function uploadNotices(file) {
  const token = localStorage.getItem('auth_token')
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/notices/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to upload notices CSV')
  }
  return res.json()
}

export async function sendNotices(rows) {
  const res = await fetch(`${BASE_URL}/notices/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ rows }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to send notices')
  }
  return res.json()
}

export function getNoticeSampleUrl() {
  return `${BASE_URL}/notices/sample`
}

export async function cancelMessage(messageId) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to cancel message')
  return res.json()
}
