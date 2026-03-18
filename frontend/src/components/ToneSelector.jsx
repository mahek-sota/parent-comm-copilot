import './ToneSelector.css'

const TONES = [
  { value: 'friendly', label: '😊 Friendly' },
  { value: 'professional', label: '📋 Professional' },
  { value: 'brief', label: '⚡ Brief' },
]

export default function ToneSelector({ tone, onChange }) {
  return (
    <div className="tone-selector" role="group" aria-label="Message tone">
      {TONES.map((t) => (
        <button
          key={t.value}
          className={`tone-pill ${tone === t.value ? 'tone-pill--active' : ''}`}
          onClick={() => onChange(t.value)}
          aria-pressed={tone === t.value}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
