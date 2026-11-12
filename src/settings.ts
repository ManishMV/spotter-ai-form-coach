// User preferences, remembered on this device (no accounts). Safe if storage is blocked.
import { useCallback, useState } from 'react'

/**
 * How much form coaching to give. No-reps (why a rep didn't count) and position prompts are
 * always on — without them the count would look random.
 *   all    = safety, technique and minor cues, plus praise
 *   safety = only safety cues (injury risk), plus praise when one is fixed
 *   off    = counting only
 */
export type CoachingMode = 'all' | 'safety' | 'off'

export type Settings = {
  coaching: CoachingMode
  /** Show the live angle readout on the workout screen. */
  showDetails: boolean
}

const DEFAULTS: Settings = { coaching: 'all', showDetails: true }
const KEY = 'spotter.settings.v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load)
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // storage blocked (private mode): the setting still applies for this session
      }
      return next
    })
  }, [])
  return [settings, update] as const
}
