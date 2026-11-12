// Setup: show where to place the phone, then one big Start button.
import { Logo } from '../components/Logo'
import { SetupIllustration } from '../components/SetupIllustration'
import type { Exercise } from '../exercises'

export function Setup({ exercise, onStart, onBack }: { exercise: Exercise; onStart: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between border-b border-line">
        <Logo />
        <button onClick={onBack} className="label press -mr-3 h-11 px-3 text-muted hover:text-ink">
          ← Back
        </button>
      </header>

      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <p className="label text-accent">{exercise.name}</p>
        <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.03em] text-balance sm:text-[44px]">Set up your phone</h1>

        <div className="dot-grid mt-8 border border-line p-4 sm:p-6">
          <SetupIllustration camera={exercise.camera} exercise={exercise.id} />
        </div>

        <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
          {exercise.tips.map((tip, i) => (
            <li key={tip} className="flex items-baseline gap-3 bg-paper px-4 py-3 sm:block sm:p-4">
              <span className="label text-faint">0{i + 1}</span>
              <p className="text-[15px] leading-snug text-pretty sm:mt-2">{tip}</p>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10">
          <button
            onClick={onStart}
            className="press flex h-16 w-full items-center justify-center gap-3 bg-accent text-lg font-medium tracking-[-0.01em] text-accent-ink hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[72px] sm:text-xl"
          >
            Start
          </button>
          <p className="label mt-3 text-center text-faint">Camera stays on this device</p>
        </div>
      </main>
    </div>
  )
}
