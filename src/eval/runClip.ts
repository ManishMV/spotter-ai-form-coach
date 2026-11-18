// Runs one recorded clip through Spotter exactly as the live camera would: the same pose model, tracking
// (FrameAnalyzer), counting gate and rep counter. Frame by frame at 30 fps by seeking the video, so results
// don't depend on how fast the computer is.
import { loadPoseLandmarker } from '../pose/landmarker'
import { FrameAnalyzer } from '../pose/frameAnalyzer'
import { CountGate } from '../coach/countGate'
import { RepCounter } from '../coach/repCounter'
import { firingCues } from '../coach/cueEngine'
import type { Exercise } from '../exercises/types'
import type { Angles } from '../coach/angles'
import type { SpotterRep } from './score'

const FPS = 30
/** Like the live countdown: counting starts once the person has been ready (in view, side-on, start position) this long. */
const READY_MS = 1000

export async function runClip(
  url: string,
  exercise: Exercise,
  model: 'lite' | 'full',
  onProgress?: (share: number) => void,
  /** Debugging: called with what Spotter saw on every frame (`?trace` on the eval page). */
  trace?: (f: { ms: number; seen: boolean; side: string | null; facing: boolean; inView: boolean; missing: string[]; angles: Angles; started: boolean; gate: boolean; phase: string }) => void,
): Promise<{ reps: SpotterRep[]; startedAtMs: number | null; frames: number }> {
  const rule = exercise.reps!
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error(`Couldn't open ${url}. Is the file there, and is it H.264 MP4 (not HEVC)?`))
  })
  const landmarker = await loadPoseLandmarker(model) // fresh per clip: no tracking carried over between clips
  const isAtTop = (a: Angles) => {
    const v = a[rule.metric]
    return v !== null && v > rule.upAbove
  }
  const analyzer = new FrameAnalyzer({ isAtTop, mustSee: () => exercise.mustSee ?? [] })
  const gate = new CountGate()
  const counter = new RepCounter(rule)
  const reps: SpotterRep[] = []
  let readySince: number | null = null
  let startedAtMs: number | null = null
  let frames = 0
  const total = Math.floor(video.duration * FPS)
  // The model's timestamps must keep increasing, and loading warms it up at "now": start after that.
  const base = Math.ceil(performance.now()) + 1000
  try {
    for (let i = 0; i < total; i++) {
      const t = i / FPS
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
        video.currentTime = t
      })
      const ms = Math.round(t * 1000)
      const result = landmarker.detectForVideo(video, base + ms)
      frames++
      const analysed = analyzer.analyze(result.landmarks[0], result.worldLandmarks[0], ms, video.videoWidth / video.videoHeight)
      if (i % 15 === 0) onProgress?.(i / total)
      if (!analysed) {
        trace?.({ ms, seen: false, side: null, facing: false, inView: false, missing: [], angles: {} as Angles, started: startedAtMs !== null, gate: false, phase: counter.phase })
        readySince = null
        continue
      }
      const { readout } = analysed
      const log = (gate: boolean) =>
        trace?.({ ms, seen: true, side: readout.side, facing: readout.facing, inView: readout.inView, missing: readout.missing, angles: readout.angles, started: startedAtMs !== null, gate, phase: counter.phase })
      if (startedAtMs === null) {
        const ready = !!readout.side && readout.inView && !readout.facing && isAtTop(readout.angles)
        readySince = ready ? (readySince ?? ms) : null
        if (readySince !== null && ms - readySince >= READY_MS) startedAtMs = ms
        else {
          log(false)
          continue
        }
      }
      const open = gate.allow(counter.phase, readout.facing, readout.inView, ms)
      log(open)
      if (!open) continue
      const rep = counter.update(readout.angles, ms)
      if (!rep) continue
      reps.push({
        counted: rep.counted,
        failed: rep.failed?.id ?? null,
        failedText: rep.failed?.text ?? null,
        flags: rep.counted ? firingCues(exercise.cues, rep.stats).map((c) => ({ id: c.id, text: c.text, kind: c.kind })) : [],
        atMs: ms,
      })
    }
  } finally {
    landmarker.close()
    video.removeAttribute('src')
    video.load()
  }
  onProgress?.(1)
  return { reps, startedAtMs, frames }
}
