import type { Exercise } from './types'

export const squat: Exercise = {
  id: 'squat',
  name: 'Squat',
  summary: 'Bodyweight or barbell. Side view.',
  checks: ['Depth', 'Chest position'],
  camera: { height: 'hip', distance: '2–3 m' },
  tips: ['Phone at hip height', 'Stand side-on to the camera', 'Whole body in frame'],
}
