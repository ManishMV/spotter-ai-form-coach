// Accuracy eval page (dev only: `npm run eval`). Plays every labelled clip in evals/ through Spotter's
// real tracking and rules, then shows a scorecard: good reps judged right, false alarms, and misses.
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/theme.css'
import { squat } from '../exercises/squat'
import { pushup } from '../exercises/pushup'
import { runClip } from './runClip'
import { align, LABELS, parseLabels, scorecard, type ClipLabel, type Pair, type Scorecard } from './score'

const EXERCISES = { squat, pushup }
type ClipResult = { clip: ClipLabel; pairs: Pair[]; error?: string; started: boolean }

const pct = (ok: number, of: number) => (of ? `${ok}/${of} (${Math.round((ok / of) * 100)}%)` : '–')

function report(results: ClipResult[]): string {
  const lines: string[] = [`Spotter eval, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '']
  for (const ex of ['squat', 'pushup'] as const) {
    const rs = results.filter((r) => r.clip.exercise === ex)
    if (!rs.length) continue
    const s = scorecard(rs.flatMap((r) => r.pairs))
    lines.push(`## ${ex === 'squat' ? 'Squats' : 'Push-ups'} (${rs.length} clips, ${s.reps} labelled reps)`)
    lines.push(`- Good reps judged right: ${pct(s.goodCounted.ok, s.goodCounted.of)}  · false alarms: ${s.falseAlarms}`)
    lines.push(`- Reps that shouldn't count, rejected: ${pct(s.shouldNotCount.ok, s.shouldNotCount.of)}`)
    for (const [label, f] of Object.entries(s.faults)) lines.push(`- ${LABELS[label as keyof typeof LABELS]}: caught ${pct(f!.caught, f!.of)}`)
    lines.push(`- Misses (faulty reps let through): ${s.misses}  · reps not registered: ${s.missedReps}  · extra reps counted: ${s.phantoms.counted}, extra messages: ${s.phantoms.extra}`)
    lines.push('')
  }
  lines.push('## Per clip')
  for (const r of results) {
    lines.push(`${r.clip.file} (${r.clip.exercise}, ${r.clip.device})${r.clip.note ? ` — your note: ${r.clip.note}` : ''}${r.error ? ` ERROR: ${r.error}` : !r.started ? ' NEVER STARTED: no ready start position found' : ''}`)
    for (const p of r.pairs) {
      const yours = p.index !== null ? r.clip.notes[p.index] : null
      lines.push(`  ${p.label ?? '(none)'}${yours ? ` (${yours})` : ''} → ${p.verdict.kind}${p.verdict.note ? `: ${p.verdict.note}` : ''}`)
    }
  }
  return lines.join('\n')
}

function Card({ title, s }: { title: string; s: Scorecard }) {
  const row = (k: string, v: string, bad = false) => (
    <div className="flex justify-between gap-4 border-b border-white/10 py-1.5 text-[14px]">
      <span className="text-white/70">{k}</span>
      <span className={bad ? 'text-[var(--accent)]' : ''}>{v}</span>
    </div>
  )
  return (
    <section className="border border-white/15 p-4">
      <h2 className="mb-2 text-[17px] font-medium">{title}</h2>
      {row('Good reps judged right', pct(s.goodCounted.ok, s.goodCounted.of))}
      {row('False alarms (good reps failed or flagged)', String(s.falseAlarms), s.falseAlarms > 0)}
      {row("Shouldn't count, rejected", pct(s.shouldNotCount.ok, s.shouldNotCount.of))}
      {Object.entries(s.faults).map(([l, f]) => row(`Caught: ${LABELS[l as keyof typeof LABELS]}`, pct(f!.caught, f!.of), f!.caught < f!.of))}
      {row('Misses (faulty reps let through)', String(s.misses), s.misses > 0)}
      {row('Reps not registered', String(s.missedReps), s.missedReps > 0)}
      {row('Extra reps counted / extra messages', `${s.phantoms.counted} / ${s.phantoms.extra}`, s.phantoms.counted > 0)}
    </section>
  )
}

function EvalPage() {
  const [clips, setClips] = useState<ClipLabel[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [results, setResults] = useState<ClipResult[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/evals/labels.csv')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('evals/labels.csv not found'))))
      .then((t) => {
        const { clips, errors } = parseLabels(t)
        setClips(clips)
        setErrors(errors)
        if (new URLSearchParams(location.search).has('run')) void run(clips)
      })
      .catch((e) => setErrors([String(e.message ?? e)]))
  }, [])

  async function run(list: ClipLabel[]) {
    const out: ClipResult[] = []
    setResults([])
    for (const clip of list) {
      setRunning(`${clip.file} …`)
      try {
        const ex = EXERCISES[clip.exercise]
        const { reps, startedAtMs } = await runClip(`/evals/clips/${clip.file}`, ex, clip.device === 'phone' ? 'lite' : 'full', (p) =>
          setRunning(`${clip.file} ${Math.round(p * 100)}%`),
        )
        out.push({ clip, pairs: align(clip.labels, reps), started: startedAtMs !== null })
      } catch (e) {
        out.push({ clip, pairs: [], error: e instanceof Error ? e.message : String(e), started: false })
      }
      setResults([...out])
    }
    setRunning(null)
    ;(window as unknown as { __evalReport: string }).__evalReport = report(out) // for automated runs
  }

  const done = results.length > 0 && running === null
  return (
    <main className="mx-auto max-w-[880px] px-4 py-8 text-white">
      <h1 className="text-[28px] font-medium tracking-[-0.02em]">Spotter accuracy eval</h1>
      <p className="mt-1 text-[14px] text-white/60">
        {clips.length} labelled clips in evals/. Each runs frame by frame through the real tracking and rules.
      </p>
      {errors.map((e) => (
        <p key={e} className="mt-2 text-[14px] text-[var(--accent)]">
          {e}
        </p>
      ))}
      <div className="mt-4 flex gap-3">
        <button className="bg-white px-4 py-2 text-[15px] text-black disabled:opacity-40" disabled={!!running || !clips.length} onClick={() => run(clips)}>
          {running ? 'Running…' : 'Run eval'}
        </button>
        {done && (
          <button
            className="border border-white/30 px-4 py-2 text-[15px]"
            onClick={() => navigator.clipboard.writeText(report(results)).then(() => setCopied(true))}
          >
            {copied ? 'Copied' : 'Copy report'}
          </button>
        )}
      </div>
      {running && <p className="mt-3 text-[14px] text-white/70">{running}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(['squat', 'pushup'] as const).map((ex) => {
          const rs = results.filter((r) => r.clip.exercise === ex)
          return rs.length ? <Card key={ex} title={ex === 'squat' ? 'Squats' : 'Push-ups'} s={scorecard(rs.flatMap((r) => r.pairs))} /> : null
        })}
      </div>

      <div className="mt-6 grid gap-3">
        {results.map((r) => (
          <details key={r.clip.file} className="border border-white/10 p-3" open={!!r.error || r.pairs.some((p) => p.verdict.kind !== 'correct')}>
            <summary className="cursor-pointer text-[15px]">
              {r.clip.file} <span className="text-white/50">· {r.clip.exercise}, {r.clip.device}</span>
              {r.clip.note && <span className="text-white/50"> · “{r.clip.note}”</span>}
              {r.error && <span className="text-[var(--accent)]"> · {r.error}</span>}
              {!r.error && !r.started && <span className="text-[var(--accent)]"> · never got to a ready start position</span>}
            </summary>
            <table className="mt-2 w-full text-left text-[13px]">
              <tbody>
                {r.pairs.map((p, i) => (
                  <tr key={i} className={p.verdict.kind === 'correct' ? 'text-white/60' : 'text-[var(--accent)]'}>
                    <td className="py-0.5 pr-3">
                      {p.label ?? '—'}
                      {p.index !== null && r.clip.notes[p.index] && <span className="text-white/45"> ({r.clip.notes[p.index]})</span>}
                    </td>
                    <td className="pr-3">{p.verdict.kind}</td>
                    <td>{p.verdict.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </main>
  )
}

// No StrictMode here: it would run the eval twice.
createRoot(document.getElementById('root')!).render(<EvalPage />)
