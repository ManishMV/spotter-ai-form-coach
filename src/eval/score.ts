// Scores Spotter's reps against hand labels. Pure logic (no browser), so it can be checked on its own.
//
// Two kinds of mistakes, measured separately on purpose:
//   • False alarm: a GOOD rep that Spotter didn't count, or flagged with a form fix.
//   • Miss: a FAULTY rep that Spotter counted with no matching fix.
// Fixing only what testers complain about lowers false alarms but can quietly raise misses (nobody complains
// about a bad rep that passed). A rule change should lower one without raising the other.

/** What one rep in a clip really was, as labelled by hand. */
export type Label =
  | 'good' // a proper rep
  | 'half' // not deep enough
  | 'fast' // bounced or rushed
  | 'chest' // squat: chest dropped / leaned too far forward
  | 'hips' // squat: hips shot up first on the way up
  | 'knee' // push-up: knees on the floor
  | 'sag' // push-up: hips sagging
  | 'pike' // push-up: hips piked up
  | 'bent' // push-up: arms not straight at the top

export const LABELS: Record<Label, string> = {
  good: 'Good rep',
  half: 'Not deep enough',
  fast: 'Too fast / bounced',
  chest: 'Chest dropped (squat)',
  hips: 'Hips rose first (squat)',
  knee: 'Knees on the floor (push-up)',
  sag: 'Hips sagging (push-up)',
  pike: 'Hips piked (push-up)',
  bent: 'Arms bent at the top (push-up)',
}

/** One rep as Spotter judged it. */
export type SpotterRep = {
  counted: boolean
  /** Why it didn't count (requirement id, or 'partial' / 'too-fast'). */
  failed: string | null
  failedText: string | null
  /** Form fixes that fired on a counted rep: cue id + kind. */
  flags: { id: string; text: string; kind: 'safety' | 'technique' | 'minor' }[]
  atMs: number
}

/** Which of Spotter's verdicts count as "caught it" for each fault. Not counting the rep always counts as caught. */
const CATCHES: Partial<Record<Label, string[]>> = {
  fast: ['control-descent'],
  chest: ['chest-up'],
  hips: ['hips-rise-first'],
  sag: ['hips-up'],
  pike: ['hips-down'],
  bent: ['lockout-tip'],
}

/** For faults that should never count (not just get a tip). */
const MUST_NOT_COUNT: Label[] = ['half', 'knee', 'fast']

export type Verdict =
  | { kind: 'correct'; note?: string }
  | { kind: 'false-alarm'; note: string } // good rep, judged wrong
  | { kind: 'miss'; note: string } // faulty rep, let through
  | { kind: 'missed-rep'; note: string } // a labelled rep Spotter never registered
  | { kind: 'phantom'; note: string } // Spotter registered a rep that wasn't there

export type Pair = { label: Label | null; rep: SpotterRep | null; verdict: Verdict }

const fixes = (rep: SpotterRep) => rep.flags.filter((f) => f.kind !== 'minor')

export function judge(label: Label, rep: SpotterRep): Verdict {
  if (label === 'good') {
    if (!rep.counted) return { kind: 'false-alarm', note: `not counted: ${rep.failedText}` }
    const f = fixes(rep)
    if (f.length) return { kind: 'false-alarm', note: `flagged: ${f.map((x) => x.text).join(', ')}` }
    const minor = rep.flags.map((x) => x.text)
    return { kind: 'correct', note: minor.length ? `minor tip: ${minor.join(', ')}` : undefined }
  }
  if (!rep.counted) return { kind: 'correct', note: `not counted: ${rep.failedText}` }
  if (MUST_NOT_COUNT.includes(label) && !CATCHES[label]?.some((id) => rep.flags.some((f) => f.id === id))) {
    return { kind: 'miss', note: 'counted' + (rep.flags.length ? ` (tips: ${rep.flags.map((f) => f.text).join(', ')})` : '') }
  }
  const hit = rep.flags.find((f) => CATCHES[label]?.includes(f.id))
  if (hit) return { kind: 'correct', note: `${MUST_NOT_COUNT.includes(label) ? 'counted, but ' : ''}tip: ${hit.text}` }
  return { kind: 'miss', note: 'counted' + (rep.flags.length ? ` (other tips: ${rep.flags.map((f) => f.text).join(', ')})` : ', no tip') }
}

/**
 * Lines up the labelled reps with Spotter's reps, in order. Spotter can register extra reps (wobbles) or skip
 * some, so it's an alignment: the cheapest way to pair them up, where a verdict that agrees with the label
 * costs nothing, one that disagrees costs 1, and leaving a rep unpaired costs a bit more.
 */
export function align(labels: Label[], reps: SpotterRep[]): Pair[] {
  const GAP = 1.2
  const cost = (l: Label, r: SpotterRep) => (judge(l, r).kind === 'correct' ? 0 : 1)
  const n = labels.length
  const m = reps.length
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 1; i <= n; i++) dp[i][0] = i * GAP
  for (let j = 1; j <= m; j++) dp[0][j] = j * GAP
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j - 1] + cost(labels[i - 1], reps[j - 1]), dp[i - 1][j] + GAP, dp[i][j - 1] + GAP)
  const out: Pair[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost(labels[i - 1], reps[j - 1])) {
      out.push({ label: labels[i - 1], rep: reps[j - 1], verdict: judge(labels[i - 1], reps[j - 1]) })
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP) {
      out.push({ label: labels[i - 1], rep: null, verdict: { kind: 'missed-rep', note: 'Spotter registered no rep here' } })
      i--
    } else {
      const r = reps[j - 1]
      out.push({ label: null, rep: r, verdict: { kind: 'phantom', note: r.counted ? 'counted a rep that wasn’t there' : `extra: ${r.failedText}` } })
      j--
    }
  }
  return out.reverse()
}

export type Scorecard = {
  reps: number
  goodCounted: { ok: number; of: number } // good reps counted and not flagged
  falseAlarms: number
  shouldNotCount: { ok: number; of: number } // half / knee / fast reps rejected
  faults: Partial<Record<Label, { caught: number; of: number }>>
  misses: number
  missedReps: number
  phantoms: { counted: number; extra: number } // extra reps Spotter counted / extra "not counted" messages
}

export function scorecard(pairs: Pair[]): Scorecard {
  const s: Scorecard = {
    reps: 0,
    goodCounted: { ok: 0, of: 0 },
    falseAlarms: 0,
    shouldNotCount: { ok: 0, of: 0 },
    faults: {},
    misses: 0,
    missedReps: 0,
    phantoms: { counted: 0, extra: 0 },
  }
  for (const p of pairs) {
    if (p.label === null) {
      if (p.rep?.counted) s.phantoms.counted++
      else s.phantoms.extra++
      continue
    }
    s.reps++
    if (p.verdict.kind === 'missed-rep') s.missedReps++
    if (p.label === 'good') {
      s.goodCounted.of++
      if (p.verdict.kind === 'correct') s.goodCounted.ok++
      if (p.verdict.kind === 'false-alarm' || p.verdict.kind === 'missed-rep') s.falseAlarms++
      continue
    }
    const f = (s.faults[p.label] ??= { caught: 0, of: 0 })
    f.of++
    if (p.verdict.kind === 'correct') f.caught++
    else s.misses++
    if (MUST_NOT_COUNT.includes(p.label)) {
      s.shouldNotCount.of++
      if (p.rep && !p.rep.counted) s.shouldNotCount.ok++
    }
  }
  return s
}

/** `file, exercise, device, rep labels` → one entry per clip. Lines starting with # are comments. */
export type ClipLabel = { file: string; exercise: 'squat' | 'pushup'; device: 'phone' | 'laptop'; labels: Label[] }

export function parseLabels(csv: string): { clips: ClipLabel[]; errors: string[] } {
  const clips: ClipLabel[] = []
  const errors: string[] = []
  csv.split(/\r?\n/).forEach((line, n) => {
    const t = line.trim()
    if (!t || t.startsWith('#') || /^file\s*,/i.test(t)) return
    const [file, exercise, device, reps] = t.split(',').map((x) => x.trim())
    const where = `line ${n + 1}`
    if (!file || !reps) return errors.push(`${where}: needs file, exercise, device, reps`)
    if (exercise !== 'squat' && exercise !== 'pushup') return errors.push(`${where}: exercise must be squat or pushup`)
    if (device !== 'phone' && device !== 'laptop') return errors.push(`${where}: device must be phone or laptop`)
    const labels = reps.split(/\s+/).map((x) => x.toLowerCase()) as Label[]
    const bad = labels.filter((l) => !(l in LABELS))
    if (bad.length) return errors.push(`${where}: unknown label ${bad.join(', ')} (use ${Object.keys(LABELS).join(', ')})`)
    clips.push({ file, exercise, device, labels })
  })
  return { clips, errors }
}
