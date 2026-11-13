// End-of-set summary: how many reps, the one thing to work on next time, and why any reps didn't count.
// One primary action: "Go again".
import { useEffect, useState } from 'react'
import { Logo } from '../components/Logo'
import type { SetSummary } from '../coach/setTracker'
import type { Exercise } from '../exercises'
import { announceSetComplete } from '../voice/announce'
import { copyResults, FEEDBACK_FORM_URL, isTester, logSet, setCount } from '../tester'
import { track } from '../analytics'

function formatTime(ms: number) {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`
}

export function Summary({
  exercise,
  summary,
  onAgain,
  onDone,
  announce = true,
  embedded = false,
}: {
  exercise: Exercise
  summary: SetSummary
  onAgain: () => void
  onDone: () => void
  /** Play the set-complete sound and voice. */
  announce?: boolean
  /** Shown inside another page (Test lab): no full-screen height. */
  embedded?: boolean
}) {
  const { reps, missed, focus, cleanReps, durationMs, target } = summary
  const hitTarget = target !== null && reps >= target
  // Closing line, positive but honest (OPTIMAL: build confidence, never make it feel like failure — and
  // never praise what didn't happen):
  //   no reps counted → nothing said and no "set complete" sound (the screen explains what to check);
  //   target reached with every rep clean → "Great set"; target reached → "Nice work";
  //   1–3 reps, or stopped before half the target → "Good start"; otherwise → "Good effort".
  const SHORT_SET = 3
  const closingLine =
    reps === 0
      ? null
      : hitTarget
        ? cleanReps === reps
          ? 'Great set'
          : 'Nice work'
        : reps <= SHORT_SET || (target !== null && reps < target / 2)
          ? 'Good start'
          : 'Good effort'
  const missedTotal = missed.reduce((n, m) => n + m.count, 0)

  // Tester mode: note this set, and offer to copy the results of every set so far.
  const tester = isTester && !embedded
  // Noted once, as the screen opens (logSet ignores repeats), so the button can show the count straight away.
  const [setsSoFar] = useState(() => {
    if (tester) logSet(exercise.name, summary)
    return setCount()
  })
  const [copied, setCopied] = useState<boolean | null>(null)
  // Analytics: one event per finished set (not in the Test lab). Counts only, nothing personal.
  useEffect(() => {
    if (embedded) return
    track('set_finished', {
      exercise: exercise.id,
      reps,
      target,
      clean_reps: cleanReps,
      missed: missedTotal,
      duration_s: Math.round(durationMs / 1000),
      ended_by: summary.endedBy ?? null,
      fps: summary.tech?.fps ?? null,
      model: summary.tech?.model ?? null,
    })
  }, [embedded, summary, exercise.id, reps, target, cleanReps, missedTotal, durationMs])

  // Waits for the coach to finish, then the set-complete sound, then the closing line.
  useEffect(() => (announce && closingLine ? announceSetComplete(closingLine) : undefined), [announce, closingLine])

  return (
    <div className={`mx-auto flex max-w-[640px] flex-col px-4 sm:px-8 ${embedded ? '' : 'min-h-dvh'}`}>
      <header className="flex h-16 items-center border-b border-line">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <p className="label text-accent">{exercise.name} · Set complete</p>

        <div className="mt-4 flex items-end gap-4">
          <p className="text-[clamp(96px,26vw,168px)] leading-[0.85] font-semibold tracking-[-0.05em] tabular-nums">{reps}</p>
          <div className="pb-3">
            <p className="text-[20px] tracking-[-0.01em]">
              {target !== null ? `of ${target} reps` : reps === 1 ? 'rep' : 'reps'}
            </p>
            {durationMs > 0 && <p className="text-[15px] text-muted">in {formatTime(durationMs)}</p>}
          </div>
        </div>
        {target !== null && (
          <p className={`label mt-4 ${hitTarget ? 'text-accent' : 'text-muted'}`}>{hitTarget ? 'Target reached' : 'Stopped early'}</p>
        )}
        {/* Only shown when there's something good to say: a "0 of 5" line feels like failure,
            and the "Next time" tip below already says what to work on. */}
        {cleanReps > 0 && (
          <p className="mt-3 text-[15px] text-muted">
            {cleanReps === reps ? 'Every rep had good form.' : `${cleanReps} of ${reps} with good form.`}
          </p>
        )}

        {/* The one thing to work on */}
        <section aria-label="Next time" className="mt-8 border border-line">
          <p className="label border-b border-line px-4 py-3 text-muted">Next time</p>
          <div className="p-4">
            {focus ? (
              <>
                <p className="text-[22px] leading-tight tracking-[-0.02em]">{focus.cue.text}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted">{focus.cue.tip}</p>
              </>
            ) : reps > 0 ? (
              <>
                <p className="text-[22px] leading-tight tracking-[-0.02em]">Keep it up</p>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted">
                  No form issues spotted. Try a few more reps next set.
                </p>
              </>
            ) : (
              <>
                <p className="text-[22px] leading-tight tracking-[-0.02em]">No reps counted this time</p>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted">
                  Check the set-up tips, then give it another go.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Reps that didn't count */}
        {missedTotal > 0 && (
          <section aria-label="Reps that didn't count" className="mt-4 border border-line">
            <p className="label border-b border-line px-4 py-3 text-muted">
              {missedTotal} {missedTotal === 1 ? 'rep' : 'reps'} didn’t count
            </p>
            <ul className="divide-y divide-line">
              {missed.map((m) => (
                <li key={m.reason} className="flex items-baseline justify-between gap-4 px-4 py-3 text-[15px]">
                  <span className="text-pretty">{m.reason}</span>
                  <span className="text-muted tabular-nums">×{m.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tester && setsSoFar > 0 && (
          <section aria-label="For testers" className="mt-4 border border-accent/60">
            <p className="label border-b border-line px-4 py-3 text-accent">For testers</p>
            <div className="p-4">
              <p className="text-[15px] leading-relaxed text-pretty text-muted">
                Finished testing? This copies the results of every set you've done in this visit (squats and
                push-ups together) and opens a 2-minute feedback form. Paste them into the results question. Want to
                try the other exercise first? Tap Done, do it, and copy at the end.
              </p>
              <button
                onClick={async () => {
                  // Copy first: once the form opens in a new tab, this page loses focus and can't copy.
                  const ok = await copyResults()
                  setCopied(ok)
                  track('feedback_form_opened', { exercise: exercise.id })
                  window.open(FEEDBACK_FORM_URL, '_blank', 'noopener')
                }}
                className="press mt-3 h-12 w-full border border-line bg-paper text-[15px] hover:bg-paper-2"
              >
                {copied
                  ? 'Copied. Paste it into the form'
                  : copied === false
                    ? 'Couldn’t copy. Try again'
                    : `Copy results (${setsSoFar} ${setsSoFar === 1 ? 'set' : 'sets'}) and open the form`}
              </button>
              {copied !== null && (
                <a
                  href={FEEDBACK_FORM_URL}
                  target="_blank"
                  rel="noopener"
                  className="label mt-3 inline-flex h-11 items-center text-muted underline decoration-line underline-offset-4 hover:text-ink"
                >
                  Form didn’t open? Open it here
                </a>
              )}
            </div>
          </section>
        )}

        {/* Two equal buttons. "Go again" is the filled orange main action (same colour as Start = workout
            action) on the right, where the thumb lands; "Done" is a calm outline, equally easy to tap. */}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-10">
          <button
            onClick={onDone}
            className="press h-16 border border-line bg-paper text-lg tracking-[-0.01em] hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[72px]"
          >
            Done
          </button>
          <button
            onClick={onAgain}
            className="press h-16 bg-accent text-lg font-medium tracking-[-0.01em] text-accent-ink hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[72px]"
          >
            Go again
          </button>
        </div>
      </main>
    </div>
  )
}
