import type { Exercise } from './types'

export const squat: Exercise = {
  id: 'squat',
  name: 'Squat',
  summary: 'Bodyweight or barbell. Side view.',
  checks: ['Depth', 'Chest position'],
  camera: { height: 'hip', distance: '2–3 m' },
  mustSee: ['shoulder', 'hip', 'knee', 'ankle'],
  tips: ['Stand side-on to the camera', 'Whole body in frame'],
  // Rules from NSCA / ACE / biomechanics research — see docs/SQUAT-FORM.md for sources.
  // Standing ≈ 170–180° knee angle; thighs parallel ≈ 70–100°.
  reps: {
    metric: 'knee',
    downBelow: 100, // must reach about parallel to count
    upAbove: 160, // and stand back up tall
    minRepMs: 1000, // faster than 1 s = bouncing, not a controlled rep
    // Went below 140° but not to depth → partial rep: not counted, tell them why.
    partialBelow: 140,
    partialText: 'Go deeper',
    startText: 'Stand tall to start',
    requires: [
      // Not a lunge / split squat. Rejected only when BOTH signals say lunge:
      //  1. Feet split front-to-back (research: > 0.30 × leg length; we use 0.35). Needs the hidden
      //     far foot, whose guessed position can be badly off at the bottom of a deep squat
      //     (seen in testing when facing right) — so it can't decide alone.
      //  2. Balance: shoulders not over the visible foot (only uses points the camera sees).
      // Medians over the rep, so brief tracking errors don't decide the result.
      {
        id: 'not-a-lunge',
        text: 'Feet side by side — that was a lunge',
        anyOf: [
          { metric: 'stanceSplit', stat: 'median', op: '<', value: 0.35 },
          { metric: 'balance', stat: 'median', op: '<', value: 0.3 },
        ],
      },
    ],
  },
}
