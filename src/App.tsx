// Spotter: Home (landing) → Setup → Workout. `?debug` opens the plain tracking test view.
import { lazy, Suspense, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Exercise } from './exercises'
import { useSettings } from './settings'
import { Home } from './screens/Home'
import { Setup } from './screens/Setup'

// Camera + pose-tracking code loads only when needed, so the landing page stays fast.
const Workout = lazy(() => import('./screens/Workout').then((m) => ({ default: m.Workout })))
const DebugCamera = lazy(() => import('./screens/DebugCamera').then((m) => ({ default: m.DebugCamera })))
const preloadWorkout = () => import('./screens/Workout')

type Screen = { name: 'home' } | { name: 'setup'; exercise: Exercise } | { name: 'workout'; exercise: Exercise }

const isDebug = new URLSearchParams(location.search).has('debug')

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  // Coaching/details choices are per exercise and kept for the day (see settings.ts).
  const [settings, updateSettings] = useSettings(screen.name === 'home' ? '' : screen.exercise.id)
  if (isDebug)
    return (
      <Suspense fallback={null}>
        <DebugCamera />
      </Suspense>
    )

  const go = (next: Screen) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screen.name}
        className="relative min-h-dvh"
        initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
      >
        {screen.name === 'home' && (
          <Home
            onPick={(exercise) => {
              preloadWorkout() // start fetching camera code while they read the setup screen
              go({ name: 'setup', exercise })
            }}
          />
        )}
        {screen.name === 'setup' && (
          <Setup
            exercise={screen.exercise}
            settings={settings}
            onSettings={updateSettings}
            onBack={() => go({ name: 'home' })}
            onStart={() => go({ name: 'workout', exercise: screen.exercise })}
          />
        )}
        {screen.name === 'workout' && (
          <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
            <Workout exercise={screen.exercise} settings={settings} onEnd={() => go({ name: 'setup', exercise: screen.exercise })} />
          </Suspense>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
