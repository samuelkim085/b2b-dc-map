import { useState, useCallback, useEffect } from 'react'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const STORAGE_KEY = 'b2b-dc-map-settings'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      console.warn('[useSettings] Failed to persist settings to localStorage')
    }
  }, [settings])

  const setSettings = useCallback((update: Partial<AppSettings>) => {
    setSettingsState(prev => ({ ...prev, ...update }))
  }, [])

  return { settings, setSettings }
}
