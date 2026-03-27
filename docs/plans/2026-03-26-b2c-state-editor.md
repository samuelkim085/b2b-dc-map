# B2C State Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app editor page for `b2c_qty_by_state_2025.csv` so users can modify per-state shipment quantities and save them back to disk during development.

**Architecture:** A Vite dev plugin adds `POST /api/save-b2c` to the dev server. AppBar gets an "Edit" button (b2c mode only) that switches App's view state to `'b2cEditor'`. A new `B2cEditorPage` component loads the CSV, renders an editable table, and POSTs the updated CSV on save.

**Tech Stack:** React + TypeScript, Vite plugin API (`configureServer`), Node.js `fs.writeFileSync`, PapaParse (already installed)

---

### Task 1: Add Vite dev plugin for `POST /api/save-b2c`

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add plugin to vite.config.ts**

Replace the file with:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function b2cSavePlugin() {
  return {
    name: 'b2c-save',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/save-b2c', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const filePath = path.resolve('public/data/b2c_qty_by_state_2025.csv')
            fs.writeFileSync(filePath, body, 'utf-8')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), b2cSavePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
  },
})
```

**Step 2: Verify dev server starts without errors**

Run: `npm run dev`
Expected: Server starts on port 5173 (or 3000) with no errors in console.
Stop the server after confirming.

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add dev plugin for POST /api/save-b2c"
```

---

### Task 2: Update `useB2cData` to accept a `refreshKey`

**Files:**
- Modify: `src/hooks/useB2cData.ts`

**Step 1: Add refreshKey parameter**

```typescript
export function useB2cData(refreshKey = 0): {
  volumes: Record<string, number>
  loading: boolean
  error: string | null
} {
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/b2c_qty_by_state_2025.csv', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load B2C CSV: ${r.status}`)
        return r.text()
      })
      .then(text => {
        const { data } = Papa.parse<{ ship_to_state: string; total_qty: string }>(text, {
          header: true,
          skipEmptyLines: true,
        })
        const result: Record<string, number> = {}
        for (const row of data) {
          const qty = Number(String(row.total_qty).replace(/,/g, ''))
          if (row.ship_to_state && !isNaN(qty)) {
            result[row.ship_to_state] = qty
          }
        }
        setVolumes(result)
        setLoading(false)
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        setError(String(err))
        setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  return { volumes, loading, error }
}
```

Key change: function signature accepts `refreshKey = 0`, and `[refreshKey]` is added to the `useEffect` dependency array.

**Step 2: Run existing tests**

Run: `npm run test`
Expected: All tests pass (no B2C hook tests exist yet, that's fine).

**Step 3: Commit**

```bash
git add src/hooks/useB2cData.ts
git commit -m "feat: useB2cData accepts refreshKey for refetch"
```

---

### Task 3: Add view state and `b2cRefreshKey` to `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add state and update useB2cData call**

In `App.tsx`, make the following changes:

1. Add new import at top:
```typescript
import { B2cEditorPage } from "./components/B2cEditorPage";
```

2. Add new state variables after existing state declarations (around line 22):
```typescript
const [view, setView] = useState<'map' | 'b2cEditor'>('map');
const [b2cRefreshKey, setB2cRefreshKey] = useState(0);
```

3. Update `useB2cData` call (line 21) to pass the key:
```typescript
const { volumes: b2cVolumes } = useB2cData(b2cRefreshKey);
```

4. Pass `onOpenEditor` to `AppBar` and render `B2cEditorPage` conditionally.

Updated JSX return (replace existing return):
```tsx
return (
  <div className="app-shell">
    <AppBar
      svgRef={svgRef}
      selectedOrigin={selectedOrigin}
      dataMode={dataMode}
      onDataModeChange={setDataMode}
      onOpenB2cEditor={dataMode === 'b2c' ? () => setView('b2cEditor') : undefined}
    />
    {view === 'b2cEditor' ? (
      <B2cEditorPage
        onClose={() => setView('map')}
        onSaved={() => { setB2cRefreshKey(k => k + 1); setView('map'); }}
      />
    ) : (
      <div className="app-body">
        <FilterPanel
          filters={effectiveFilters}
          onChange={handleFiltersChange}
          flowSettings={flowSettings}
          onFlowChange={setFlowSettings}
          settings={settings}
          onSettingsChange={setSettings}
          allCustomers={allCustomers}
          origins={KNOWN_ORIGINS}
          flowDestinationOptions={FLOW_MANUAL_DESTINATION_OPTIONS}
          maxVolume={maxVolume}
          maxDistance={maxDistance}
          panelWidth={settings.filterPanelWidth}
          dataMode={dataMode}
        />
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize filter panel"
          aria-orientation="vertical"
          onPointerDown={handlePanelResizeStart}
        />
        <ShipmentsMap
          records={records}
          filters={effectiveFilters}
          flowSettings={flowSettings}
          settings={settings}
          svgRef={svgRef}
          dataMode={dataMode}
          b2cVolumes={b2cVolumes}
        />
      </div>
    )}
  </div>
);
```

**Step 2: Run tests**

Run: `npm run test`
Expected: Tests pass. TypeScript will error until AppBar and B2cEditorPage are updated — that's fine, fix those in next tasks.

**Step 3: Commit (after TS errors resolved in later tasks)**

Skip commit here — commit together with AppBar update in Task 4.

---

### Task 4: Update `AppBar` to accept and render the Edit button

**Files:**
- Modify: `src/components/AppBar.tsx`

**Step 1: Add `onOpenB2cEditor` prop and button**

```typescript
interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>;
  selectedOrigin: Origin;
  dataMode: 'b2b' | 'b2c';
  onDataModeChange: (mode: 'b2b' | 'b2c') => void;
  onOpenB2cEditor?: () => void;
}

export function AppBar({ svgRef, selectedOrigin, dataMode, onDataModeChange, onOpenB2cEditor }: Props) {
  return (
    <header className="app-bar">
      <span className="app-bar-title">DC MAP</span>
      <div className="app-bar-mode-toggle">
        <button
          type="button"
          className={`mode-btn${dataMode === 'b2b' ? ' active' : ''}`}
          onClick={() => onDataModeChange('b2b')}
        >
          B2B
        </button>
        <button
          type="button"
          className={`mode-btn${dataMode === 'b2c' ? ' active' : ''}`}
          onClick={() => onDataModeChange('b2c')}
        >
          B2C
        </button>
      </div>
      <div className="app-bar-actions">
        {onOpenB2cEditor && (
          <button type="button" className="mode-btn" onClick={onOpenB2cEditor}>
            Edit B2C Data
          </button>
        )}
        <ExportButton svgRef={svgRef} selectedOrigin={selectedOrigin} />
      </div>
    </header>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`
Expected: No TS errors related to AppBar or App.

**Step 3: Commit**

```bash
git add src/components/AppBar.tsx src/App.tsx
git commit -m "feat: AppBar edit button wires view state in App"
```

---

### Task 5: Create `B2cEditorPage.tsx`

**Files:**
- Create: `src/components/B2cEditorPage.tsx`

**Step 1: Create the component**

```typescript
import { useState, useEffect } from 'react'
import Papa from 'papaparse'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface StateRow {
  state: string
  qty: string  // string for input binding; validated on save
}

export function B2cEditorPage({ onClose, onSaved }: Props) {
  const [rows, setRows] = useState<StateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/b2c_qty_by_state_2025.csv')
      .then(r => r.text())
      .then(text => {
        const { data } = Papa.parse<{ ship_to_state: string; total_qty: string }>(text, {
          header: true,
          skipEmptyLines: true,
        })
        setRows(data.map(r => ({ state: r.ship_to_state, qty: r.total_qty })))
        setLoading(false)
      })
      .catch(err => {
        setError(String(err))
        setLoading(false)
      })
  }, [])

  const isValid = (qty: string) => /^\d+$/.test(qty.trim())

  const handleQtyChange = (index: number, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, qty: value } : r))
  }

  const handleSave = async () => {
    if (rows.some(r => !isValid(r.qty))) {
      setError('All quantities must be whole numbers.')
      return
    }
    setSaving(true)
    setError(null)
    const csv = Papa.unparse(rows.map(r => ({ ship_to_state: r.state, total_qty: r.qty.trim() })))
    try {
      const res = await fetch('/api/save-b2c', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csv,
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Save failed')
      onSaved()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading B2C data…</div>

  return (
    <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text)' }}>Edit B2C State Data</h2>
        <button type="button" className="mode-btn active" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="mode-btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
      {error && <div style={{ color: 'var(--bad, red)', marginBottom: '0.75rem' }}>{error}</div>}
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 400 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text)' }}>State</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text)' }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.state}>
              <td style={{ padding: '2px 8px', color: 'var(--text)' }}>{row.state}</td>
              <td style={{ padding: '2px 8px' }}>
                <input
                  type="text"
                  value={row.qty}
                  onChange={e => handleQtyChange(i, e.target.value)}
                  style={{
                    textAlign: 'right',
                    width: 100,
                    background: 'var(--panel)',
                    color: 'var(--text)',
                    border: isValid(row.qty) ? '1px solid var(--border, #444)' : '1px solid var(--bad, red)',
                    padding: '2px 4px',
                    borderRadius: 3,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Run TypeScript check**

Run: `npm run build 2>&1 | head -40`
Expected: No type errors.

**Step 3: Run tests**

Run: `npm run test`
Expected: All existing tests pass.

**Step 4: Manual smoke test**

1. `npm run dev`
2. Switch to B2C mode → "Edit B2C Data" button appears in AppBar
3. Click button → editor page loads with table of states
4. Change a value → save
5. Check `public/data/b2c_qty_by_state_2025.csv` is updated
6. Map choropleth reflects new value

**Step 5: Commit**

```bash
git add src/components/B2cEditorPage.tsx
git commit -m "feat: B2cEditorPage with inline editing and CSV save"
```
