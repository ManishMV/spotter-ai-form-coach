// Tester mode (open with ?tester): every set in this visit is noted, and the summary screen gets a
// "Copy my results" button that copies a short plain-text report of all of them, to paste into the
// tester form. Nothing is sent anywhere by the app, and nothing personal is included.
import type { SetSummary } from './coach/setTracker'

export const isTester = new URLSearchParams(location.search).has('tester')

/** The tester feedback form (Google Forms), opened straight from the summary screen. */
export const FEEDBACK_FORM_URL = 'https://forms.gle/QqekwL1zz9d9yUGK8'

const KEY = 'spotter.tester.sets'
type Logged = { exercise: string; summary: SetSummary; at: number }
const MAX_AGE_MS = 2 * 60 * 60 * 1000 // sets older than 2 hours belong to an earlier test, not this one

function load(): Logged[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as Logged[]
    return saved.filter((s) => typeof s.at === 'number' && Date.now() - s.at < MAX_AGE_MS)
  } catch {
    return []
  }
}

let sets: Logged[] = load()
// After results are copied, the next set starts a fresh batch (so a second test never repeats the first).
let copiedAll = false

function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(sets)) // survives a reload of the page
  } catch {
    // storage blocked: kept until the page closes
  }
}

/** Note a finished set (once per summary object). */
const seen = new WeakSet<SetSummary>()
export function logSet(exercise: string, summary: SetSummary) {
  if (seen.has(summary)) return
  if (summary.durationMs === 0) return // ended before "Go": not a set, so not in the results
  seen.add(summary)
  if (copiedAll) {
    sets = []
    copiedAll = false
  }
  sets = [...sets, { exercise, summary, at: Date.now() }]
  save()
}

const list = (items: { text?: string; reason?: string; count: number }[]) =>
  items.length === 0 ? 'none' : items.map((i) => `${i.text ?? i.reason} ×${i.count}`).join(', ')

/** Exercises with at least one set in the results so far (by name). */
export const testedExercises = () => new Set(sets.map((s) => s.exercise))

/** How many sets are in the results so far (this visit). */
export const setCount = () => sets.length

/** The report, one line per set. */
export function resultsText(): string {
  const lines = sets.map(({ exercise, summary: s }, i) => {
    const secs = Math.round(s.durationMs / 1000)
    const target = s.target === null ? 'no target' : `target ${s.target}`
    const tech = s.tech ? ` | ${s.tech.device}, ${s.tech.model} model, ${s.tech.fps} fps` : ''
    const form = s.reps > 0 ? ` | good form: ${s.cleanReps}/${s.reps}` : ''
    return `${i + 1}. ${exercise}: ${s.reps} counted (${target}) in ${secs} s | didn't count: ${list(s.missed)} | cues: ${list(s.cues)}${form}${tech}`
  })
  return [`Spotter tester results (${sets.length} ${sets.length === 1 ? 'set' : 'sets'})`, ...lines].join('\n')
}

/** Copy to the clipboard; falls back to a hidden text box on older browsers. */
export async function copyResults(): Promise<boolean> {
  const text = resultsText()
  copiedAll = true
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const box = document.createElement('textarea')
    box.value = text
    document.body.appendChild(box)
    box.select()
    const ok = document.execCommand('copy')
    box.remove()
    return ok
  }
}
