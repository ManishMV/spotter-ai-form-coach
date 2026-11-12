// Loads Google's MediaPipe Pose Landmarker (lite model). Runs fully in the browser.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

async function create(delegate: 'GPU' | 'CPU') {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  })
}

export async function loadPoseLandmarker(): Promise<PoseLandmarker> {
  try {
    return await create('GPU') // fast path: use the graphics chip
  } catch {
    return await create('CPU') // fallback for devices without GPU support
  }
}
