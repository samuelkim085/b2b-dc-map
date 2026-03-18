import type { AppSettings } from '../types'
import './SettingsPage.css'

interface Props {
  settings: AppSettings
  onChange: (update: Partial<AppSettings>) => void
  onBack: () => void
}

const THEMES: { value: AppSettings['appTheme']; label: string; desc: string }[] = [
  { value: 'bloomberg', label: 'Bloomberg', desc: 'Amber on black' },
  { value: 'dark',      label: 'Dark',      desc: 'Navy dark, blue accent' },
  { value: 'light',     label: 'Light',     desc: 'Clean white' },
]

const CHOROPLETH_THEMES: { value: AppSettings['choroplethTheme']; label: string }[] = [
  { value: 'greys',  label: 'Grey' },
  { value: 'greens', label: 'Green' },
]

export function SettingsPage({ settings, onChange, onBack }: Props) {
  return (
    <div className="settings-root">
      <header className="settings-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="Back to map">
          ← Back
        </button>
        <span className="settings-title">Settings</span>
      </header>

      <div className="settings-body">

        {/* Appearance */}
        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-theme-cards">
            {THEMES.map(t => (
              <button
                key={t.value}
                className={`settings-theme-card${settings.appTheme === t.value ? ' active' : ''}`}
                onClick={() => onChange({ appTheme: t.value })}
              >
                <span className="theme-card-label">{t.label}</span>
                <span className="theme-card-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="settings-divider" />

        {/* Map Style */}
        <section className="settings-section">
          <h2 className="settings-section-title">Map Style</h2>
          <div className="settings-row">
            <label className="settings-label">Choropleth color</label>
            <div className="settings-segmented">
              {CHOROPLETH_THEMES.map(t => (
                <button
                  key={t.value}
                  className={`seg-btn${settings.choroplethTheme === t.value ? ' active' : ''}`}
                  onClick={() => onChange({ choroplethTheme: t.value })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Visible Regions */}
        <section className="settings-section">
          <h2 className="settings-section-title">Visible Regions</h2>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showAlaska} onChange={e => onChange({ showAlaska: e.target.checked })} />
              Alaska
            </label>
          </div>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showHawaii} onChange={e => onChange({ showHawaii: e.target.checked })} />
              Hawaii
            </label>
          </div>
          <div className="settings-row settings-muted-row">Canada — coming soon</div>
          <div className="settings-row settings-muted-row">United Kingdom — coming soon</div>
        </section>

        <div className="settings-divider" />

        {/* Map Layers */}
        <section className="settings-section">
          <h2 className="settings-section-title">Map Layers</h2>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showDcMarkers} onChange={e => onChange({ showDcMarkers: e.target.checked })} />
              Show DC markers
            </label>
          </div>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showZipDots} onChange={e => onChange({ showZipDots: e.target.checked })} />
              Show zip dots
            </label>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Marker Style */}
        <section className="settings-section">
          <h2 className="settings-section-title">Marker Style</h2>
          <div className="settings-row">
            <label className="settings-label">DC logo scale</label>
            <div className="settings-slider-row">
              <input type="range" min={0.5} max={2} step={0.1} value={settings.dcLogoScale}
                onChange={e => onChange({ dcLogoScale: parseFloat(e.target.value) })} />
              <span className="settings-value">{settings.dcLogoScale.toFixed(1)}×</span>
            </div>
          </div>
          <div className="settings-row">
            <label className="settings-label">Logo padding</label>
            <div className="settings-slider-row">
              <input type="range" min={0} max={12} step={1} value={settings.logoPadding}
                onChange={e => onChange({ logoPadding: parseInt(e.target.value, 10) })} />
              <span className="settings-value">{settings.logoPadding}px</span>
            </div>
          </div>
          <div className="settings-row">
            <label className="settings-label">Zip dot color</label>
            <input type="color" value={settings.zipDotColor}
              onChange={e => onChange({ zipDotColor: e.target.value })} />
          </div>
          <div className="settings-row">
            <label className="settings-label">Zip dot size</label>
            <div className="settings-slider-row">
              <input type="range" min={1} max={10} step={1} value={settings.zipDotSize}
                onChange={e => onChange({ zipDotSize: parseInt(e.target.value, 10) })} />
              <span className="settings-value">{settings.zipDotSize}px</span>
            </div>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Defaults */}
        <section className="settings-section">
          <h2 className="settings-section-title">Defaults</h2>
          <p className="settings-section-note">Changes take effect on next page load.</p>
          <div className="settings-row">
            <label className="settings-label">Default origin zip</label>
            <input
              className="settings-text-input"
              type="text"
              maxLength={5}
              value={settings.defaultOriginZip}
              onChange={e => onChange({ defaultOriginZip: e.target.value })}
            />
          </div>
          <div className="settings-row">
            <label className="settings-label">Default min volume</label>
            <input
              className="settings-text-input"
              type="number"
              min={0}
              step={100}
              value={settings.defaultMinVolume}
              onChange={e => onChange({ defaultMinVolume: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
        </section>

      </div>
    </div>
  )
}
