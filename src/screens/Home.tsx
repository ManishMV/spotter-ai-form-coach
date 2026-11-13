// Home = landing page. One primary action: pick an exercise.
import { Arrow } from '../components/Arrow'
import { Logo } from '../components/Logo'
import { EXERCISES, type Exercise } from '../exercises'
import { FEEDBACK_FORM_URL } from '../tester'

const FAQ: [string, string][] = [
  [
    'Is my video recorded or uploaded?',
    'No. Tracking runs inside your browser, and your video never leaves your device. We only count anonymous usage, like how many sets are finished, to improve Spotter. No video, no names, no cookies.',
  ],
  [
    'What is the AI part?',
    'Google’s MediaPipe pose model finds 33 points on your body in every camera frame, live, on your device. The coaching on top follows rules from coaching research, so the advice is consistent.',
  ],
  [
    'Do I need to install anything or sign up?',
    'No. Open the link in Chrome, Safari or Edge on your phone or laptop, allow the camera, and start.',
  ],
  [
    'Why didn’t a rep count?',
    'Spotter says why out loud, for example not deep enough or too fast. If reps aren’t counting at all, stand side-on in a bright room with your body in view.',
  ],
  [
    'Is this medical advice?',
    'No. It’s general form guidance for healthy adults. If something hurts, stop, and talk to a professional.',
  ],
]

export function Home({ onPick }: { onPick: (exercise: Exercise) => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1080px] flex-col px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between border-b border-line">
        <Logo />
        <span className="label flex items-center gap-2 text-muted">
          <span className="size-1.5 bg-accent" aria-hidden="true" />
          Free · Private · Beta
        </span>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-14 pb-10 sm:pt-24 sm:pb-14">
          <p className="label inline-flex items-center gap-2 border border-line bg-paper-2 px-2.5 py-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Squat & push-up · v1
          </p>
          <h1 className="mt-6 max-w-[16ch] text-[40px] leading-[1.08] font-normal tracking-[-0.035em] text-balance sm:text-[64px]">
            A form coach that watches every rep.
          </h1>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-pretty text-muted sm:text-lg">
            Spotter counts your reps and calls out form fixes, out loud, while you train. It runs in your
            browser. No app, no account, and your video never leaves your device.
          </p>
          {/* Honest about where Spotter is: an early side project, starting small. */}
          <p className="mt-5 max-w-[52ch] border-l-2 border-accent pl-3 text-[15px] leading-relaxed text-pretty text-muted">
            Early version. Spotter is a side project that starts with the two most common at-home exercises.
            More are on the way, and{' '}
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener" className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
              your feedback
            </a>{' '}
            decides what comes next.
          </p>
        </section>

        {/* Primary action: choose exercise */}
        <section aria-labelledby="choose">
          <h2 id="choose" className="label mb-3 text-muted">
            Choose your exercise
          </h2>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {EXERCISES.map((exercise, i) => (
              <button
                key={exercise.id}
                onClick={() => onPick(exercise)}
                className="group press flex min-h-[200px] flex-col justify-between bg-paper p-6 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:min-h-[240px] sm:p-8"
              >
                <div className="flex items-start justify-between">
                  <span className="label text-faint">0{i + 1}</span>
                  <span className="grid size-11 place-items-center bg-ink text-paper transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-ink">
                    <Arrow />
                  </span>
                </div>
                <div>
                  <p className="text-[32px] leading-none tracking-[-0.03em] sm:text-[40px]">{exercise.name}</p>
                  <p className="mt-3 text-[15px] text-muted">{exercise.summary}</p>
                  <p className="label mt-4 text-faint">Checks: {exercise.checks.join(' · ')}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-20 sm:mt-28" aria-labelledby="how">
          <h2 id="how" className="label mb-3 text-muted">
            How it works
          </h2>
          <ol className="dot-grid grid gap-px border border-line sm:grid-cols-3">
            {[
              ['Place your phone or laptop', 'Side-on, 1–3 m away, with your body in view.'],
              ['Tap start', 'Spotter finds your body and starts tracking straight away.'],
              ['Train', 'Reps are counted on screen. Form fixes are spoken after each rep.'],
            ].map(([title, body], i) => (
              <li key={title} className="m-4 border border-line bg-paper p-5 sm:m-5">
                <span className="label text-accent">Step 0{i + 1}</span>
                <p className="mt-3 text-lg tracking-[-0.01em]">{title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy */}
        <section className="mt-20 sm:mt-28" aria-labelledby="private">
          <h2 id="private" className="label mb-3 text-muted">
            Private by design
          </h2>
          <div className="grid border-t border-line sm:grid-cols-3">
            {[
              ['On-device AI', "Pose tracking uses Google's MediaPipe, running inside your browser."],
              ['Nothing uploaded', 'Your camera feed is never sent anywhere or stored.'],
              ['No sign-up', 'Open the link and train. Nothing to install.'],
            ].map(([title, body]) => (
              <div key={title} className="border-b border-line py-5 sm:border-b-0 sm:py-6 sm:pr-8">
                <p className="text-[17px] tracking-[-0.01em]">{title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-pretty text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ: the few questions people ask before turning on a camera. Native details/summary: no script. */}
        <section className="mt-20 mb-20 sm:mt-28" aria-labelledby="faq">
          <h2 id="faq" className="label mb-3 text-muted">
            Questions
          </h2>
          <div className="border-t border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden="true" className="text-muted transition-transform duration-150 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[64ch] pb-5 text-[15px] leading-relaxed text-pretty text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="label flex h-16 items-center justify-between border-t border-line text-faint">
        <span>Spotter · AI Form Coach</span>
        <span>v1 · 2026</span>
      </footer>
    </div>
  )
}
