import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../src/App'
import * as api from '../src/api'

// ── Mock the api module ───────────────────────────────────────────────────────

vi.mock('../src/api', () => ({
  fetchChildren: vi.fn(),
  fetchEventTypes: vi.fn(),
  fetchClassrooms: vi.fn(),
  generateMessage: vi.fn(),
}))

const MOCK_CHILDREN = [
  {
    child_id: '1',
    name: 'Emma Johnson',
    classroom_id: 'toddler_b',
    parent_email: 'johnson.family@gmail.com',
    allergies: 'none',
    notes: '',
  },
  {
    child_id: '2',
    name: 'Noah Smith',
    classroom_id: 'infant_a',
    parent_email: 'ksmith.family@outlook.com',
    allergies: 'peanuts',
    notes: 'Has EpiPen on file',
  },
]

const MOCK_EVENT_TYPES = [
  {
    event_type: 'incident',
    display_name: 'Incident Report',
    requires_injury_field: true,
    requires_action_field: true,
  },
  {
    event_type: 'daily_update',
    display_name: 'Daily Update',
    requires_injury_field: false,
    requires_action_field: false,
  },
]

const MOCK_GENERATE_RESPONSE = {
  child_name: 'Emma Johnson',
  parent_email: 'johnson.family@gmail.com',
  event_type: 'incident',
  generated_message:
    "Hi Emma's family, we wanted to let you know Emma had an incident today. Please let us know if you have any questions. – Toddler B Team",
  tone: 'friendly',
  classroom: 'Toddler B',
}

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchChildren.mockResolvedValue(MOCK_CHILDREN)
  api.fetchEventTypes.mockResolvedValue(MOCK_EVENT_TYPES)
  api.fetchClassrooms.mockResolvedValue([])
  api.generateMessage.mockResolvedValue(MOCK_GENERATE_RESPONSE)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App', () => {
  it('renders the dashboard header without crashing', async () => {
    render(<App />)
    expect(screen.getByText('Parent Communication Copilot')).toBeInTheDocument()
    expect(screen.getByText('Sunrise Learning Center')).toBeInTheDocument()
  })

  it('renders the compose and output panels', () => {
    render(<App />)
    expect(screen.getByText('Compose Message')).toBeInTheDocument()
    expect(screen.getByText('Generated Message')).toBeInTheDocument()
  })

  it('populates the child dropdown from the API', async () => {
    render(<App />)
    const input = screen.getByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => {
      expect(screen.getByText('Emma Johnson')).toBeInTheDocument()
      expect(screen.getByText('Noah Smith')).toBeInTheDocument()
    })
  })

  it('renders event type buttons from the API', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Incident Report')).toBeInTheDocument()
      expect(screen.getByText('Daily Update')).toBeInTheDocument()
    })
  })

  it('generate button is disabled when no child is selected', async () => {
    render(<App />)
    // Wait for data to load so the button is rendered
    await waitFor(() => screen.getByText('Incident Report'))
    const btn = screen.getByRole('button', { name: /generate message/i })
    expect(btn).toBeDisabled()
  })

  it('generate button is disabled when no event type is selected', async () => {
    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    // Select a child but leave event type unselected
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    // Event types are loaded but none selected
    await waitFor(() => screen.getByText('Incident Report'))
    const btn = screen.getByRole('button', { name: /generate message/i })
    expect(btn).toBeDisabled()
  })

  it('generate button becomes enabled after child and event type are selected', async () => {
    render(<App />)
    // Select child
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    // Select event type
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))
    const btn = screen.getByRole('button', { name: /generate message/i })
    expect(btn).not.toBeDisabled()
  })

  it('calls generateMessage with correct payload on submit', async () => {
    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))

    await userEvent.click(screen.getByRole('button', { name: /generate message/i }))

    await waitFor(() => expect(api.generateMessage).toHaveBeenCalledTimes(1))
    const [calledPayload] = api.generateMessage.mock.calls[0]
    expect(calledPayload.child_id).toBe('1')
    expect(calledPayload.event_type).toBe('incident')
    expect(calledPayload.tone).toBe('friendly')
  })

  it('displays the generated message in the output panel', async () => {
    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))
    await userEvent.click(screen.getByRole('button', { name: /generate message/i }))

    await waitFor(() => {
      expect(screen.getByText(/Please let us know if you have any questions/i)).toBeInTheDocument()
    })
  })

  it('shows the copy button after message is generated', async () => {
    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))
    await userEvent.click(screen.getByRole('button', { name: /generate message/i }))

    await waitFor(() => screen.getByRole('button', { name: /copy message/i }))
  })

  it('copy button triggers clipboard write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))
    await userEvent.click(screen.getByRole('button', { name: /generate message/i }))

    const copyBtn = await screen.findByRole('button', { name: /copy message/i })
    await userEvent.click(copyBtn)

    expect(writeText).toHaveBeenCalledWith(MOCK_GENERATE_RESPONSE.generated_message)
  })

  it('shows error banner when API call fails', async () => {
    api.generateMessage.mockRejectedValue(new Error('Server error'))

    render(<App />)
    const input = await screen.findByPlaceholderText('Search for a child…')
    await userEvent.click(input)
    await waitFor(() => screen.getByText('Emma Johnson'))
    await userEvent.click(screen.getByText('Emma Johnson'))
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))
    await userEvent.click(screen.getByRole('button', { name: /generate message/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it('shows incident-specific fields only for incident event type', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Incident Report'))
    await userEvent.click(screen.getByText('Incident Report'))

    expect(screen.getByLabelText('Injury Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Action Taken')).toBeInTheDocument()
  })

  it('hides incident fields for daily update event type', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Daily Update'))
    await userEvent.click(screen.getByText('Daily Update'))

    expect(screen.queryByLabelText('Injury Description')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Action Taken')).not.toBeInTheDocument()
  })

  it('shows error banner when initial data load fails', async () => {
    api.fetchChildren.mockRejectedValue(new Error('Backend offline'))
    api.fetchEventTypes.mockRejectedValue(new Error('Backend offline'))

    render(<App />)

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})
