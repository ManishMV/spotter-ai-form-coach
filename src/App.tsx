// Step 1: camera on + skeleton drawn on top. Deliberately unstyled (design comes in Step 3).
import { useEffect, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { startCamera, stopCamera } from './pose/camera'
import { loadPoseLandmarker, pickModelSize, type ModelSize } from './pose/landmarker'
import { drawSkeleton } from './pose/drawSkeleton'

type Status = 'idle' | 'loading' | 'running' | 'error'

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [fps, setFps] = useState(0)
  const [model, setModel] = useState<ModelSize>(pickModelSize)

  const stopRef = useRef<() => void>(() => {})
  useEffect(() => () => stopRef.current(), [])

  async function start() {
    setStatus('loading')
    let stream: MediaStream | null = null
    let landmarker: PoseLandmarker | null = null
    let frameId = 0
    try {
      const video = videoRef.current!
      const canvas = canvasRef.current!
      const size = pickModelSize()
      ;[stream, landmarker] = await Promise.all([startCamera(video), loadPoseLandmarker(size)])
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
      const loop = () => {
        const now = performance.now()
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const result = landmarker!.detectForVideo(video, now)
          drawSkeleton(ctx, result.landmarks)
          frames++
        }
        if (now - fpsStart >= 1000) {
          setFps(frames)
          const warmedUp = now - startedAt > 3000
          slowSeconds = warmedUp && frames < 20 ? slowSeconds + 1 : 0
          if (slowSeconds >= 3 && size === 'full' && !forced && !switching) {
            switching = true
            loadPoseLandmarker('lite').then((lite) => {
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
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
    stopRef.current = () => {
      cancelAnimationFrame(frameId)
      stopCamera(stream)
      landmarker?.close()
    }
  }

  return (
    <main className="relative flex h-full items-center justify-center">
      {/* Mirrored so it feels like a mirror; video + canvas flipped together so they line up. */}
      <div className="relative h-full w-full -scale-x-100">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />
      </div>

      {status !== 'running' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {status === 'idle' && (
            <button onClick={start} className="rounded-full bg-white px-10 py-5 text-xl font-semibold text-black">
              Start camera
            </button>
          )}
          {status === 'loading' && <p className="text-lg">Loading camera and pose model…</p>}
          {status === 'error' && <p className="max-w-md text-lg text-red-400">Couldn't start: {error}</p>}
        </div>
      )}

      {status === 'running' && (
        <p className="absolute top-4 left-4 rounded bg-black/60 px-2 py-1 font-mono text-sm">{fps} fps · {model}</p>
      )}
    </main>
  )
}
