// Camera + MediaPipe pose tracking loop, shared by the workout screen and the debug view.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { startCamera, stopCamera } from './camera'
import { loadPoseLandmarker, pickModelSize, type ModelSize } from './landmarker'
import { drawSkeleton } from './drawSkeleton'
import type { BodyPart } from '../exercises/types'
import type { Angles } from '../coach/angles'
import { FrameAnalyzer, type Readout, EMPTY_READOUT } from './frameAnalyzer'

export { EMPTY_READOUT, type Readout }

/** Analyses right after a model loads that are left out of speed measurements (set-up time). */
const WARMUP_ANALYSES = 5

export type TrackingStatus = 'idle' | 'loading' | 'running' | 'error'
/** `facing` = person faces the camera instead of standing side-on (side-view checks don't work then). */
/** `inView` = every body part the exercise needs is inside the picture. */

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
  // While loading: the camera comes first, then the AI model (usually already loaded on the setup screen).
  const [loadingStep, setLoadingStep] = useState<'camera' | 'model'>('camera')
  const stopRef = useRef<() => void>(() => {})

  const stop = useCallback(() => {
    stopRef.current()
    stopRef.current = () => {}
  }, [])
  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    stop()
    setStatus('loading')
    setLoadingStep('camera')
    let stream: MediaStream | null = null
    let landmarker: PoseLandmarker | null = null
    let modelReady: Promise<PoseLandmarker> | null = null
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
      modelReady = loadPoseLandmarker(size)
      modelReady.catch(() => {}) // a camera error is the one to report; the model's is seen below
      stream = await startCamera(video)
      if (stopped) {
        stopCamera(stream)
        modelReady.then((l) => l.close()).catch(() => {})
        return
      }
      setLoadingStep('model')
      landmarker = await modelReady
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
      // Smoothing, side picking, in-view and distance: shared with the accuracy evals (src/eval).
      const analyzer = new FrameAnalyzer({
        isAtTop: (a) => (isAtTopRef.current ? isAtTopRef.current(a) : a.torsoLean !== null && a.torsoLean < 30),
        mustSee: () => mustSeeRef.current ?? [],
        debug,
      })
      let lastReadout = 0
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
          const analysed = analyzer.analyze(result.landmarks[0], result.worldLandmarks[0], now, video.videoWidth / video.videoHeight)
          const current = analysed?.readout ?? EMPTY_READOUT
          if (analysed) {
            const { readout, screen } = analysed
            onFrameRef.current?.(readout.angles, now, readout.facing, readout.inView)
            drawSkeleton(ctx, [screen], debug ? null : readout.side === 'left' ? 'right' : 'left') // draw only the side we track
          } else {
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
      // The camera failed (e.g. permission denied) after the model started loading: free the model, so
      // a retry doesn't leave a second copy in memory.
      if (!landmarker) modelReady?.then((l) => l.close()).catch(() => {})
      if (stopped) return
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [videoRef, canvasRef, stop, debug])

  return { status, loadingStep, error, fps, analysisMs, model, readout, start, stop }
}
