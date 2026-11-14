// Camera + MediaPipe pose tracking loop, shared by the workout screen and the debug view.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { startCamera, stopCamera } from './camera'
import { loadPoseLandmarker, pickModelSize, type ModelSize } from './landmarker'
import { drawSkeleton } from './drawSkeleton'
import { PointSmoother } from './smoothing'
import type { BodyPart } from '../exercises/types'
import { edgeRoom, isFacingCamera, measureAngles, NO_ANGLES, partsOutOfView, pickSide, shoulderSpread, stanceDiagnostics, type Angles, type Side, type StanceDiag } from '../coach/angles'

/** Analyses right after a model loads that are left out of speed measurements (set-up time). */
const WARMUP_ANALYSES = 5

export type TrackingStatus = 'idle' | 'loading' | 'running' | 'error'
/** `facing` = person faces the camera instead of standing side-on (side-view checks don't work then). */
/** `inView` = every body part the exercise needs is inside the picture. */
export type Readout = {
  side: Side | null
  facing: boolean
  inView: boolean
  /** Whether side-on vs facing has actually been checked yet (only possible standing in the start position). */
  facingKnown: boolean
  /** While out of view: which needed body parts are missing (so the prompt can say "feet", "knees"…). */
  missing: BodyPart[]
  angles: Angles
  diag: StanceDiag | null
  /** Debug view: room left between the needed body parts and the picture's edge (0–0.5), or null. */
  room: number | null
  /** Debug view: the tightest `room` over the last 5 s (covers a whole rep); null if a part left the picture. */
  roomTightest: number | null
}

export const EMPTY_READOUT: Readout = { side: null, facing: false, inView: true, facingKnown: false, missing: [], angles: NO_ANGLES, diag: null, room: null, roomTightest: null }

/** Called on every frame where a person is visible (used for rep counting). */
export type FrameHandler = (angles: Angles, timeMs: number, facing: boolean, inView: boolean) => void

export function usePoseTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: {
    /** Called on every frame where a person is visible (rep counting). */
    onFrame?: FrameHandler
    /**
     * Is the person in the exercise's start position (standing tall for squats, arms straight for
     * push-ups)? Facing vs side-on is only re-checked there: mid-rep, hidden body parts are
     * guessed and can make a side-on body look like it faces the camera.
     */
    isAtTop?: (angles: Angles) => boolean
    /** Body parts that must be in the picture (else `inView` turns false and counting should pause). */
    mustSee?: BodyPart[]
    /** Debug view: draw both legs (including the guessed hidden one) and compute diagnostics. */
    debug?: boolean
  } = {},
) {
  const { onFrame, isAtTop, mustSee, debug = false } = options
  const onFrameRef = useRef(onFrame)
  const isAtTopRef = useRef(isAtTop)
  const mustSeeRef = useRef(mustSee)
  useEffect(() => {
    onFrameRef.current = onFrame
    isAtTopRef.current = isAtTop
    mustSeeRef.current = mustSee
  }, [onFrame, isAtTop, mustSee])
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [error, setError] = useState('')
  const [fps, setFps] = useState(0)
  /** Average time one pose analysis takes, in ms (shown in the details, useful on phones). */
  const [analysisMs, setAnalysisMs] = useState(0)
  const [model, setModel] = useState<ModelSize>(pickModelSize)
  const [readout, setReadout] = useState<Readout>(EMPTY_READOUT)
  const stopRef = useRef<() => void>(() => {})

  const stop = useCallback(() => {
    stopRef.current()
    stopRef.current = () => {}
  }, [])
  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    stop()
    setStatus('loading')
    let stream: MediaStream | null = null
    let landmarker: PoseLandmarker | null = null
    let frameId = 0
    let stopped = false
    stopRef.current = () => {
      stopped = true
      cancelAnimationFrame(frameId)
      stopCamera(stream)
      landmarker?.close()
    }
    try {
      const video = videoRef.current!
      const canvas = canvasRef.current!
      const size = pickModelSize()
      ;[stream, landmarker] = await Promise.all([startCamera(video), loadPoseLandmarker(size)])
      if (stopped) {
        stopCamera(stream)
        landmarker.close()
        return
      }
      setModel(size)
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!

      let lastVideoTime = -1
      let frames = 0
      let fpsStart = performance.now()
      // Lag guard: if the "full" model runs slow, quietly switch to "lite".
      const forced = new URLSearchParams(location.search).has('model')
      const startedAt = performance.now()
      let slowSeconds = 0
      let switching = false
      // Smoothing + angles.
      const screenSmoother = new PointSmoother()
      const worldSmoother = new PointSmoother()
      let side: Side | null = null
      let facing = false
      // In view / out of view, debounced so a single flickering frame doesn't toggle the prompt.
      let inView = true
      let facingKnown = false // reset when nobody is in view
      let missing: BodyPart[] = []
      let viewStreak = 0
      let lastReadout = 0
      let roomLog: { at: number; room: number | null }[] = [] // debug view: last 5 s of `room`
      // Speed: average analysis time, and when the last analysis ran. On a slow device, back-to-back
      // analyses would leave no time for the screen, sounds and voice, so leave a short gap after each.
      // The first analyses after a model loads are very slow (the graphics card is being set up: seconds,
      // not milliseconds). They're left out of the average: counting them made the gap after each analysis
      // seconds long, so tracking crawled at ~1 frame a second for the first half-minute (seen Nov 13).
      let avgMs = 0
      let lastAnalysis = 0
      let warmupLeft = WARMUP_ANALYSES
      const SLOW_MS = 40 // above this per analysis, the device can't do ~25/s comfortably
      const MAX_GAP_MS = 150 // never wait longer than this between analyses

      const loop = () => {
        const now = performance.now()
        // Breathing room on slow devices (~10 analyses/s at 80 ms), capped so it can never stall tracking.
        const wait = avgMs > SLOW_MS ? Math.min(avgMs * 1.25, MAX_GAP_MS) : 0
        if (video.currentTime !== lastVideoTime && now - lastAnalysis >= wait) {
          lastVideoTime = video.currentTime
          lastAnalysis = now
          const t0 = performance.now()
          const result = landmarker!.detectForVideo(video, now)
          const took = performance.now() - t0
          if (warmupLeft > 0) warmupLeft--
          else avgMs = avgMs === 0 ? took : avgMs * 0.9 + took * 0.1
          const raw = result.landmarks[0]
          const rawWorld = result.worldLandmarks[0]
          let current: Readout = EMPTY_READOUT
          if (raw && rawWorld) {
            const screen = screenSmoother.smooth(raw, now)
            const world = worldSmoother.smooth(rawWorld, now)
            // Which leg to track is decided only in the start position, then locked for the rep: at the
            // bottom of a squat both knees push forward and the near/far reading gets close, and a mid-rep
            // hop to the far (guessed, straighter) leg read deep squats as shallow (tester, Nov 14).
            const isTop = (a: Angles) =>
              isAtTopRef.current ? isAtTopRef.current(a) : a.torsoLean !== null && a.torsoLean < 30
            if (side === null) side = pickSide(screen, null, world)
            let angles = measureAngles(screen, world, side)
            let atTop = isTop(angles)
            if (atTop) {
              const best = pickSide(screen, side, world)
              if (best !== side) {
                side = best
                angles = measureAngles(screen, world, side)
                atTop = isTop(angles)
              }
            }
            // Decide facing vs side-on only in the start position too (see `isAtTop`).
            if (atTop) {
              facing = isFacingCamera(shoulderSpread(screen, video.videoWidth / video.videoHeight), facing)
              facingKnown = true
            }
            const outOfView = partsOutOfView(screen, side, mustSeeRef.current ?? [])
            const nowInView = outOfView.length === 0
            if (!nowInView) missing = outOfView
            viewStreak = nowInView === inView ? 0 : viewStreak + 1
            if (viewStreak >= (inView ? 8 : 4)) {
              inView = nowInView // ~0.25 s out to pause, ~0.1 s back in to resume
              viewStreak = 0
            }
            current = {
              side,
              facing,
              facingKnown,
              inView,
              missing: inView ? [] : missing,
              angles,
              diag: debug ? stanceDiagnostics(screen, world, side, video.videoWidth / video.videoHeight) : null,
              room: null,
              roomTightest: null,
            }
            if (debug) {
              const room = edgeRoom(screen, side, mustSeeRef.current ?? [])
              roomLog = [...roomLog.filter((x) => now - x.at < 5000), { at: now, room }]
              const out = roomLog.some((x) => x.room === null)
              current.room = room
              current.roomTightest = out ? null : Math.min(...roomLog.map((x) => x.room!))
            }
            onFrameRef.current?.(current.angles, now, facing, inView)
            drawSkeleton(ctx, [screen], debug ? null : side === 'left' ? 'right' : 'left') // draw only the side we track
          } else {
            // Nobody in frame: start smoothing fresh next time.
            screenSmoother.reset()
            worldSmoother.reset()
            side = null
            facing = false
            facingKnown = false
            inView = true
            viewStreak = 0
            drawSkeleton(ctx, [])
          }
          // Update on-screen numbers ~10x a second (every frame would slow React down).
          if (now - lastReadout > 100) {
            setReadout(current)
            lastReadout = now
          }
          frames++
        }
        if (now - fpsStart >= 1000) {
          setFps(frames)
          setAnalysisMs(Math.round(avgMs))
          const warmedUp = warmupLeft === 0 && now - startedAt > 3000
          slowSeconds = warmedUp && frames < 20 ? slowSeconds + 1 : 0
          if (slowSeconds >= 3 && size === 'full' && !forced && !switching) {
            switching = true
            loadPoseLandmarker('lite').then((lite) => {
              if (stopped) return lite.close()
              landmarker?.close()
              landmarker = lite
              avgMs = 0 // fresh model: measure it fresh, after its own warm-up
              warmupLeft = WARMUP_ANALYSES
              setModel('lite')
            })
          }
          frames = 0
          fpsStart = now
        }
        frameId = requestAnimationFrame(loop)
      }
      frameId = requestAnimationFrame(loop)
      setStatus('running')
    } catch (e) {
      if (stopped) return
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [videoRef, canvasRef, stop, debug])

  return { status, error, fps, analysisMs, model, readout, start, stop }
}
