import { useState, useRef, useEffect } from 'react'
import { CUSTOMER_COLORS } from '../types'
import './CustomerDropdown.css'

interface Props {
  allCustomers: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function CustomerDropdown({ allCustomers, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key])
  }

  const removeTag = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(k => k !== key))
  }

  return (
    <div className="customer-dropdown" ref={ref}>
      <label className="filter-label">CUSTOMERS</label>
      <div className="dropdown-trigger" onClick={() => setOpen(o => !o)} role="button" tabIndex={0}>
        <div className="tag-list">
          {selected.length === 0 ? (
            <span className="placeholder">All customers</span>
          ) : (
            selected.map(key => (
              <span
                key={key}
                className="customer-tag"
                style={{ '--tag-color': CUSTOMER_COLORS[key] ?? '#888' } as React.CSSProperties}
              >
                {key}
                <button
                  className="tag-remove"
                  aria-label={`remove ${key}`}
                  onClick={e => removeTag(key, e)}
                >×</button>
              </span>
            ))
          )}
        </div>
        <span className="dropdown-arrow" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="dropdown-menu" role="listbox">
          {allCustomers.map(key => (
            <label key={key} className="dropdown-item">
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={() => toggle(key)}
              />
              <span
                className="item-dot"
                style={{ background: CUSTOMER_COLORS[key] ?? '#888' }}
              />
              {key}
            </label>
          ))}
          <div className="dropdown-footer">
            <button onClick={() => onChange([])}>All</button>
            <button onClick={() => onChange(allCustomers)}>Select All</button>
          </div>
        </div>
      )}
    </div>
  )
}
