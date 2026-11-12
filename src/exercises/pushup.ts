import type { Exercise } from './types'

export const pushup: Exercise = {
  id: 'pushup',
  name: 'Push-up',
  summary: 'Standard push-ups. Side view.',
  checks: ['Straight body line', 'Depth'],
  camera: { height: 'floor', distance: '1.5–2 m' },
  tips: ['Phone on the floor, propped up', 'Body side-on to the camera', 'Head to feet in frame'],
}
