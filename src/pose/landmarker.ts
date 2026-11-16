// Loads Google's MediaPipe Pose Landmarker. Runs fully in the browser (video never leaves the device).
// Two model sizes: "full" (more accurate, heavier) and "lite" (faster, for phones).
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { detectDevice } from '../device'

export type ModelSize = 'lite' | 'full'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const modelUrl = (size: ModelSize) =>
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${size}/float16/latest/pose_landmarker_${size}.task`

// Ignore weak detections (default is 0.5). Higher = fewer flickers and false skeletons.
const MIN_CONFIDENCE = 0.6

/** Phones get lite, laptops get full. `?model=lite|full` in the URL overrides, for testing. */
export function pickModelSize(): ModelSize {
  const forced = new URLSearchParams(location.search).get('model')
  if (forced === 'lite' || forced === 'full') return forced
  return detectDevice() === 'phone' ? 'lite' : 'full'
}

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null

async function create(size: ModelSize, delegate: 'GPU' | 'CPU') {
  filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL)
  return PoseLandmarker.createFromOptions(await filesetPromise, {
    baseOptions: { modelAssetPath: modelUrl(size), delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: MIN_CONFIDENCE,
    minPosePresenceConfidence: MIN_CONFIDENCE,
    minTrackingConfidence: MIN_CONFIDENCE,
  })
}

// If the graphics-chip set-up hasn't finished in this long, use the slower but dependable CPU path.
// Some iPhones never finish it, and the screen sat on "Starting camera…" for good (tester, Nov 16).
const GPU_TIMEOUT_MS = 12000

async function createSafely(size: ModelSize): Promise<PoseLandmarker> {
  const gpu = create(size, 'GPU') // fast path: use the graphics chip
  const timedOut = Symbol()
  const winner = await Promise.race([
    gpu.catch(() => null), // no GPU support: fall back right away
    new Promise<typeof timedOut>((r) => setTimeout(() => r(timedOut), GPU_TIMEOUT_MS)),
  ])
  if (winner && winner !== timedOut) return winner
  if (winner === timedOut) gpu.then((late) => late.close()).catch(() => {}) // finished too late: discard
  return create(size, 'CPU')
}

/** One quick analysis of a blank picture, so the first real frames aren't slowed by first-time set-up. */
function warmUp(landmarker: PoseLandmarker) {
  try {
    const blank = document.createElement('canvas')
    blank.width = blank.height = 256
    blank.getContext('2d')!.fillRect(0, 0, 256, 256)
    landmarker.detectForVideo(blank, performance.now())
  } catch {
    // Warming up is only a speed-up; tracking works without it.
  }
}

// A model loaded ahead of time (on the setup screen), handed over when the set starts.
let early: { size: ModelSize; promise: Promise<PoseLandmarker> } | null = null

/** Start downloading and setting up the model before the camera turns on. Safe to call more than once. */
export function preloadPoseLandmarker() {
  if (early) return
  const size = pickModelSize()
  const promise = createSafely(size).then((l) => (warmUp(l), l))
  promise.catch(() => {
    if (early?.promise === promise) early = null // failed: the set will try again itself
  })
  early = { size, promise }
}

export async function loadPoseLandmarker(size: ModelSize): Promise<PoseLandmarker> {
  if (early && early.size === size) {
    const { promise } = early
    early = null // each model is used by one set only (it's closed when the set ends)
    try {
      return await promise
    } catch {
      // fall through and try again
    }
  }
  const landmarker = await createSafely(size)
  warmUp(landmarker)
  return landmarker
}
