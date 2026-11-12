// Camera + MediaPipe pose tracking loop, shared by the workout screen and the debug view.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { startCamera, stopCamera } from './camera'
import { loadPoseLandmarker, pickModelSize, type ModelSize } from './landmarker'
import { drawSkeleton } from './drawSkeleton'
import { PointSmoother } from './smoothing'
import { measureAngles, pickSide, type Angles, type Side } from '../coach/angles'

export type TrackingStatus = 'idle' | 'loading' | 'running' | 'error'
export type Readout = { side: Side | null; angles: Angles }

export const EMPTY_READOUT: Readout = { side: null, angles: { knee: null, hip: null, elbow: null } }

export function usePoseTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [error, setError] = useState('')
  const [fps, setFps] = useState(0)
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
      let lastReadout = 0

      const loop = () => {
        const now = performance.now()
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const result = landmarker!.detectForVideo(video, now)
          const raw = result.landmarks[0]
          const rawWorld = result.worldLandmarks[0]
          let current: Readout = EMPTY_READOUT
          if (raw && rawWorld) {
            const screen = screenSmoother.smooth(raw, now)
            const world = worldSmoother.smooth(rawWorld, now)
            side = pickSide(screen, side)
            current = { side, angles: measureAngles(screen, world, side) }
            drawSkeleton(ctx, [screen])
          } else {
            // Nobody in frame: start smoothing fresh next time.
            screenSmoother.reset()
            worldSmoother.reset()
            side = null
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
          const warmedUp = now - startedAt > 3000
          slowSeconds = warmedUp && frames < 20 ? slowSeconds + 1 : 0
          if (slowSeconds >= 3 && size === 'full' && !forced && !switching) {
            switching = true
            loadPoseLandmarker('lite').then((lite) => {
              if (stopped) return lite.close()
              landmarker?.close()
              landmarker = lite
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
  }, [videoRef, canvasRef, stop])

  return { status, error, fps, model, readout, start, stop }
}
