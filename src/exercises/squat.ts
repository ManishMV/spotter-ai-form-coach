import type { Exercise } from './types'

export const squat: Exercise = {
  id: 'squat',
  name: 'Squat',
  summary: 'Bodyweight or barbell. Side view.',
  checks: ['Depth', 'Chest position'],
  camera: { height: 'hip', distance: '2–3 m' },
  tips: ['Phone at hip height', 'Stand side-on to the camera', 'Whole body in frame'],
  // Count a rep when the knee bends below 110° and then straightens past 160°.
  // (Standing ≈ 170–180°, parallel squat ≈ 90–100°.)
  reps: { metric: 'knee', downBelow: 110, upAbove: 160, minRepMs: 600 },
}
