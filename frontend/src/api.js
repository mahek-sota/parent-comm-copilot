const BASE_URL = 'http://localhost:8000'

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

export async function sendMessage(payload) {
  const res = await fetch(`${BASE_URL}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to send message')
  }
  return res.json()
}

export async function generateMessage(payload) {
  const res = await fetch(`${BASE_URL}/generate-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to generate message')
  }
  return res.json()
}
