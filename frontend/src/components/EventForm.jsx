import './EventForm.css'

export default function EventForm({ eventType, formData, onChange }) {
  function update(field, value) {
    onChange({ ...formData, [field]: value })
  }

  return (
    <div className="event-form">
      <div className="form-group">
        <label className="form-label" htmlFor="time-of-event">
          Time of Event
        </label>
        <input
          id="time-of-event"
          type="time"
          className="form-input"
          value={formData.time_of_event || ''}
          onChange={(e) => update('time_of_event', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="event-notes">
          Notes
        </label>
        <textarea
          id="event-notes"
          className="form-textarea"
          placeholder="Describe what happened…"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => update('notes', e.target.value)}
        />
      </div>

      {eventType.requires_injury_field && (
        <div className="form-group">
          <label className="form-label" htmlFor="injury-description">
            Injury Description
          </label>
          <input
            id="injury-description"
            type="text"
            className="form-input"
            placeholder="e.g. scrape on left knee"
            value={formData.injury_description || ''}
            onChange={(e) => update('injury_description', e.target.value)}
          />
        </div>
      )}

      {eventType.requires_action_field && (
        <div className="form-group">
          <label className="form-label" htmlFor="action-taken">
            Action Taken
          </label>
          <input
            id="action-taken"
            type="text"
            className="form-input"
            placeholder="e.g. cleaned and bandaged"
            value={formData.action_taken || ''}
            onChange={(e) => update('action_taken', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
