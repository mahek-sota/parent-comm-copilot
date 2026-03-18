import { useState } from 'react'

import './ChildSelector.css'

export default function ChildSelector({ children, selected, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = children.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  function select(child) {
    onChange(child)
    setQuery(child.name)
    setOpen(false)
  }

  function handleInputChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    onChange(null)
  }

  return (
    <div className="child-selector">
      <input
        id="child-search"
        type="text"
        className="child-input"
        placeholder="Search for a child…"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Search children"
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="child-dropdown" role="listbox" aria-label="Children">
          {filtered.map((child) => (
            <li
              key={child.child_id}
              className="child-option"
              role="option"
              aria-selected={selected?.child_id === child.child_id}
              onMouseDown={() => select(child)}
            >
              <span className="child-name">{child.name}</span>
              <span className="child-classroom">{child.classroom_id}</span>
            </li>
          ))}
        </ul>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="child-no-results">No children match "{query}"</div>
      )}
    </div>
  )
}
