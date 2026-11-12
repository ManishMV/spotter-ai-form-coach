// Setup: show where to place the phone or laptop, then one big Start button.
import { useState } from 'react'
import { Logo } from '../components/Logo'
import { detectDevice, type Device } from '../device'
import { SetupIllustration } from '../components/SetupIllustration'
import type { Exercise } from '../exercises'

/** The first tip: where to put the device, for this exercise. */
function placementTip(device: Device, height: Exercise['camera']['height']) {
  if (device === 'laptop') return height === 'floor' ? 'Laptop on the floor, screen tilted back' : 'Laptop at about hip height, on a table or shelf'
  return height === 'floor' ? 'Phone on the floor, propped up' : 'Phone at hip height, propped up'
}

export function Setup({ exercise, onStart, onBack }: { exercise: Exercise; onStart: () => void; onBack: () => void }) {
  // Guessed automatically; the user can switch if we got it wrong.
  const [device, setDevice] = useState<Device>(detectDevice)
  const other: Device = device === 'laptop' ? 'phone' : 'laptop'
  const tips = [placementTip(device, exercise.camera.height), ...exercise.tips]

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
        <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.03em] text-balance sm:text-[44px]">Set up your {device}</h1>
        <button
          onClick={() => setDevice(other)}
          className="label press -ml-1 mt-3 h-11 self-start px-1 text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          Using a {other} instead?
        </button>

        <div className="dot-grid mt-5 border border-line p-4 sm:p-6">
          <SetupIllustration camera={exercise.camera} exercise={exercise.id} device={device} />
        </div>

        <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
          {tips.map((tip, i) => (
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
