import type { Exercise } from './types'

export const squat: Exercise = {
  id: 'squat',
  name: 'Squat',
  summary: 'Bodyweight or barbell. Side view.',
  checks: ['Depth', 'Chest position'],
  camera: { height: 'hip', distance: '2–3 m' },
  mustSee: ['shoulder', 'hip', 'knee', 'ankle'],
  tips: ['Stand side-on to the camera', 'Whole body in frame', 'Feet shoulder-width, toes slightly out'],
  // Rules from NSCA / ACE / biomechanics research — see docs/SQUAT-FORM.md for sources.
  // Standing ≈ 170–180° knee angle; thighs parallel ≈ 70–100°.
  reps: {
    metric: 'knee',
    downBelow: 100, // must reach about parallel to count
    upAbove: 160, // and stand back up tall
    minRepMs: 1000, // faster than 1 s = bouncing, not a controlled rep
    // Went below 140° but not to depth → partial rep: not counted, tell them why.
    partialBelow: 140,
    partialText: 'Sit deeper',
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
        text: 'Keep your feet side by side',
        anyOf: [
          { metric: 'stanceSplit', stat: 'median', op: '<', value: 0.35 },
          { metric: 'balance', stat: 'median', op: '<', value: 0.3 },
        ],
      },
    ],
  },
  // Form cues after each counted rep. Wording follows coaching research: 1–3 words, say what to do,
  // external focus where possible (Wulf; Winkelman; Myer/Kushner's "sit back as if into a chair").
  // Safety first, then progress. Safety cues (lower-back load: Myer 2014, Kushner 2015) speak up on the
  // first rep; technique cues wait for a pattern. See docs/COACHING.md.
  cues: [
    // Torso leaning > 20° more than the shins (Myer: trunk roughly parallel to the shin).
    { id: 'chest-up', metric: 'leanVsShin', stat: 'max', op: '>', value: 20, text: 'Chest up', praise: 'Nice posture', tip: 'Keep your chest lifted as you sit down, so your back stays safe.', kind: 'safety', priority: 1 },
    // Torso tips > 12° further forward on the way up = hips rising first (Myer criterion 10).
    { id: 'hips-rise-first', metric: 'hipsRiseFirst', stat: 'max', op: '>', value: 12, text: 'Lead with your chest', praise: 'Smooth rise', tip: 'On the way up, lift your chest and hips together instead of pushing your hips up first.', kind: 'safety', priority: 2 },
    // Depth standard = hips at knee height (thigh parallel). Counted at knee < 100°, but the thigh
    // can still be well above parallel: nudge toward it. Thigh > 10° above horizontal at the bottom.
    { id: 'sit-deeper', metric: 'thighTilt', stat: 'min', op: '>', value: 10, text: 'Sit deeper', praise: 'Nice depth', tip: 'Sit down until your thighs are about level with the floor.', kind: 'technique', priority: 4 },
    // Fast drop into the bottom (Myer: descent should be slower than the ascent). The rep still counts.
    // Typical controlled descents are ~1–1.5 s; under 0.5 s is a drop. Pattern, not one-off.
    { id: 'control-descent', metric: 'descentMs', stat: 'max', op: '<', value: 500, text: 'Lower with control', praise: 'Nice control', tip: 'Lower yourself slowly, taking about a second on the way down.', kind: 'technique', priority: 3 },
    // Foot tipping either way — heel up OR toes up (Myer: whole foot stays down; Kushner: push through
    // the whole foot). ≈ 3–4 cm lift. Coaching only; the rep still counts.
    { id: 'whole-foot', metric: 'footTilt', stat: 'max', op: '>', value: 10, text: 'Whole foot down', praise: 'Solid feet', tip: 'Keep your whole foot on the floor, heels and toes.', kind: 'technique', priority: 5 },
  ],
}
