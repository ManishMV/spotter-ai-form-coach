import type { Exercise } from './types'

export const squat: Exercise = {
  id: 'squat',
  name: 'Squat',
  summary: 'Bodyweight or barbell. Side view.',
  checks: ['Depth', 'Chest position'],
  // Distances from camera geometry (step 22): shoulder→ankle has to fit the picture's height. A laptop
  // webcam (~36–40° tall view) needs ~2.3–2.5 m; an upright phone (~68° tall) ~1.2–1.5 m.
  camera: { height: 'hip', distance: { laptop: '2–3 m', phone: '1.5–2 m' } },
  mustSee: ['shoulder', 'hip', 'knee', 'ankle'],
  tips: ['Stand side-on to the camera', 'Whole body in frame', 'Feet shoulder-width, toes slightly out'],
  // Rules from NSCA / ACE / biomechanics research — see docs/SQUAT-FORM.md for sources.
  // Standing ≈ 170–180° knee angle; thighs parallel ≈ 70–100°.
  reps: {
    metric: 'knee',
    downBelow: 100, // must reach about parallel to count
    // and stand back up. 150, not 160: standing straight measured 158–163° for a tester (Nov 13), so 160
    // flickered and the set never started. Still well above the 140° partial-rep line.
    upAbove: 150,
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
    // Torso leaning clearly more than the shins at the bottom (Myer: trunk roughly parallel to the shin).
    // Typical lean over the bottom half (median), not the single worst frame: a peak flagged normal squats
    // in testing (Nov 13). 30° leaves room for longer thighs and arms held forward, which need more lean. Technique, not safety:
    // with body weight the back load is low, so it waits for a pattern instead of speaking on the first rep.
    { id: 'chest-up', metric: 'leanAtBottom', stat: 'max', op: '>', value: 30, text: 'Keep your chest up', praise: 'Nice posture', tip: 'Keep your chest lifted as you sit down, so your back stays safe.', kind: 'technique', priority: 1 },
    // Torso tips > 12° further forward on the way up = hips rising first (Myer criterion 10). Technique, not
    // safety (review, Nov 13): torso angle naturally changes during a squat, so one rep isn't proof; it waits
    // for a pattern. A sharper check (hips rising faster than shoulders) can come after the evals.
    { id: 'hips-rise-first', metric: 'hipsRiseFirst', stat: 'max', op: '>', value: 12, text: 'Lead with your chest', praise: 'Smooth rise', tip: 'On the way up, lift your chest and hips together instead of pushing your hips up first.', kind: 'technique', priority: 2 },
    // Depth standard = hips at knee height (thigh parallel). Counted at knee < 100°, but the thigh
    // can still be well above parallel: nudge toward it. Thigh > 20° above horizontal at the bottom.
    // Was 10°: a tester's deepest squats were all flagged (0 of 11 'good form', Nov 13). The camera reads
    // the hip a little high, so a squat at parallel can measure ~10–20°. To be confirmed by the step 21 evals.
    // Worded differently from the no-count reason ("Sit deeper"), so users can tell "counted, go a bit
    // lower" from "didn't count" (confused in testing, Nov 13).
    { id: 'sit-deeper', metric: 'thighTilt', stat: 'min', op: '>', value: 20, text: 'A bit deeper', praise: 'Nice depth', tip: 'Sit down until your thighs are about level with the floor.', kind: 'minor', priority: 4 }, // minor: a slightly shallow but counted squat isn't bad form; mentioned only if it keeps happening
    // Fast drop into the bottom (Myer: descent should be slower than the ascent). The rep still counts.
    // Typical controlled descents are ~1–1.5 s; under 0.5 s is a drop. Pattern, not one-off.
    { id: 'control-descent', metric: 'descentMs', stat: 'max', op: '<', value: 500, text: 'Lower with control', praise: 'Nice control', tip: 'Lower yourself slowly, taking about a second on the way down.', kind: 'technique', priority: 3 },
    // Removed Nov 13: "Whole foot down" (heel or toes lifting). Bodyweight squatters rarely lift a foot, and the
    // foot points are often hidden or cut off at the frame edge, so it mostly fired on tracking noise.
  ],
}
