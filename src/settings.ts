// User preferences, saved per exercise on this device (no accounts) and kept for the day:
// after midnight everything starts fresh at the defaults. Safe if storage is blocked.
import { useCallback, useState } from 'react'

/**
 * How much form coaching to give. Reasons a rep didn't count and positioning prompts are
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
  /** Say each rep number out loud ("one, two, three…"). */
  countAloud: boolean
  /** Reps to aim for; the set finishes by itself when reached. null = no target. */
  targetReps: number | null
}

export const DEFAULT_SETTINGS: Settings = { coaching: 'all', showDetails: true, countAloud: false, targetReps: null }

/** Target choices on the setup screen. */
export const TARGET_OPTIONS: (number | null)[] = [null, 5, 10, 15, 20]

const KEY = 'spotter.settings.v2'

/** What's stored: the day it was saved, and each exercise's settings for that day. */
type Stored = { day: string; byExercise: Record<string, Partial<Settings>> }

/** Today's date on this device, e.g. "2026-11-13" (local time, so it rolls over at midnight). */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    const stored: Stored | null = raw ? JSON.parse(raw) : null
    if (stored && stored.day === today()) return stored
  } catch {
    // unreadable or blocked storage: fall through to a fresh day
  }
  return { day: today(), byExercise: {} } // a new day (or first visit): everything back to defaults
}

function save(stored: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    // storage blocked (private mode): the setting still applies until the page is closed
  }
}

/** Settings for one exercise, plus a function to change them. */
export function useSettings(exerciseId: string) {
  const [stored, setStored] = useState<Stored>(load)
  // If the page stays open past midnight, the next read starts fresh too.
  const current = stored.day === today() ? stored : { day: today(), byExercise: {} }
  const settings: Settings = { ...DEFAULT_SETTINGS, ...current.byExercise[exerciseId] }

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setStored((prev) => {
        const base = prev.day === today() ? prev : { day: today(), byExercise: {} }
        const next: Stored = {
          day: base.day,
          byExercise: { ...base.byExercise, [exerciseId]: { ...base.byExercise[exerciseId], ...patch } },
        }
        save(next)
        return next
      })
    },
    [exerciseId],
  )
  return [settings, update] as const
}
