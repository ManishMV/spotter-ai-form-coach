// Loads Google's MediaPipe Pose Landmarker. Runs fully in the browser (video never leaves the device).
// Two model sizes: "full" (more accurate, heavier) and "lite" (faster, for phones).
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

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
  const isPhoneOrTablet = matchMedia('(pointer: coarse)').matches
  return isPhoneOrTablet ? 'lite' : 'full'
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

export async function loadPoseLandmarker(size: ModelSize): Promise<PoseLandmarker> {
  try {
    return await create(size, 'GPU') // fast path: use the graphics chip
  } catch {
    return await create(size, 'CPU') // fallback for devices without GPU support
  }
}
