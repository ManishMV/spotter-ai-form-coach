import type { Exercise } from './types'

export const pushup: Exercise = {
  id: 'pushup',
  name: 'Push-up',
  summary: 'Standard push-ups. Side view.',
  checks: ['Straight body line', 'Depth'],
  // Distances from camera geometry (step 22): wrist→knee plus the head (~1.3 m) has to fit the picture's
  // width; feet may be cut off. Laptop (~60° wide) needs ~1.3 m, a sideways phone (~68° wide) ~1.1 m.
  camera: { height: 'floor', distance: { laptop: '1.5 m', phone: '1–1.5 m' } },
  // Needed to judge depth, lockout and knees. Feet/ankles may be out of frame: the knee-off-the-floor
  // check doesn't need them (body-line check is skipped for that rep if the ankle isn't seen).
  mustSee: ['shoulder', 'elbow', 'wrist', 'hip', 'knee'],
  tips: ['Body side-on to the camera', 'Head to knees in frame', 'Hands slightly wider than shoulders'],
  // Rules from ACE, CSEP/ACSM, FitnessGram and USMC standards — see docs/PUSHUP-FORM.md for sources.
  reps: {
    // Depth = upper arm parallel to the floor (FitnessGram/USMC standard): the shoulder drops to
    // elbow level. Measured as the upper arm's angle from horizontal (90 = vertical, 0 = parallel),
    // so it works the same with hands under the shoulders or further back near the chest —
    // unlike the elbow angle, which changes with hand position (found in testing).
    metric: 'upperArm',
    downBelow: 20, // within ~20° of parallel
    upAbove: 60, // arms back up under the body
    minRepMs: 800, // test cadences are 2.4–3 s per rep; under 0.8 s is a bounce or a glitch
    // Went partway down (below 45°) but not to depth → partial rep: not counted, tell them why.
    partialBelow: 45,
    partialText: 'Chest to floor',
    startText: 'Get into a plank, arms straight',
    // Medians over the rep, so a brief tracking error can't decide the result.
    // Order matters: the first rule that fails is the message shown.
    requires: [
      {
        // Must be a plank, not someone standing or kneeling and bending their arms.
        // Torso near horizontal = far from vertical.
        id: 'plank',
        text: 'Get into a plank',
        anyOf: [{ metric: 'torsoLean', stat: 'median', op: '>', value: 50 }],
      },
      {
        // Knees off the floor. Knee push-ups are a valid regression (ACSM/CSEP norms) — a separate mode later.
        // The hands are on the floor, so the wrist marks floor level: in a full push-up the knee sits
        // well above it (≈ 0.3–0.5 thigh lengths at the top); resting on the floor it's ≈ 0.1.
        // Only needs knee + wrist, so it works with the feet out of frame. `max` = the top position.
        id: 'knees-off-floor',
        text: 'Knees up for full push-ups',
        anyOf: [{ metric: 'kneeLift', stat: 'max', op: '>', value: 0.2 }],
      },
      {
        // Second knee check when the ankle is visible too: legs straight, not bent.
        id: 'legs-straight',
        text: 'Knees up for full push-ups',
        anyOf: [{ metric: 'knee', stat: 'median', op: '>', value: 150 }],
      },
      {
        // Lockout: arms fully straight at the top (standards: full extension; counters use 145–160°).
        // `max` includes the top position.
        id: 'lockout',
        text: 'Straighten your arms at the top',
        anyOf: [{ metric: 'elbow', stat: 'max', op: '>', value: 150 }],
      },
      {
        // Shoulder–hip–ankle roughly straight (no big sag or pike). Standards say "rigid torso";
        // research suggests ~160°. 155° leaves room for tracking noise; finer "Hips up / Hips down" cues come in Step 10.
        id: 'body-straight',
        text: 'Keep your body straight',
        anyOf: [{ metric: 'bodyLine', stat: 'median', op: '>', value: 155 }],
      },
    ],
  },
  // Form cues after each counted rep. Wording follows coaching research: 1–3 words, say what to do,
  // external focus where possible (Wulf; Winkelman; NASM: "lower until the chest nears the floor").
  // Lower-back safety first, then depth, then piking. Sagging hips (lower-back extension: ACE, Army) is a
  // safety cue and speaks up on the first rep; the others wait for a pattern. See docs/COACHING.md.
  // Hip offset 0.06 ≈ body line 165°; bigger faults (< 155°) don't count at all.
  cues: [
    { id: 'hips-up', metric: 'hipOffset', stat: 'min', op: '<', value: -0.06, text: 'Hips up', praise: 'Nice straight line', tip: 'Squeeze your stomach and glutes so your hips don’t sag.', kind: 'safety', priority: 1 },
    // Resting on the floor at the bottom for over 0.8 s (shoulders well below elbows). A quick
    // chest-to-floor touch never triggers it. Mentioned only if it keeps happening (3 of 4 reps).
    { id: 'stay-off-floor', metric: 'collapsedMs', stat: 'max', op: '>', value: 800, text: 'Stay off the floor', praise: 'Stayed strong', tip: 'Don’t rest on the floor at the bottom; push straight back up.', kind: 'minor', priority: 2 },
    // Fast drop to the bottom. Controlled descents are ~0.7–1.5 s; under 0.4 s is a drop. Rep still counts.
    { id: 'control-descent', metric: 'descentMs', stat: 'max', op: '<', value: 400, text: 'Lower with control', praise: 'Nice control', tip: 'Lower yourself slowly, taking about a second on the way down.', kind: 'technique', priority: 3 },
    // Counted (upper arm within 20° of parallel) but only just.
    { id: 'chest-to-floor', metric: 'upperArm', stat: 'min', op: '>', value: 10, text: 'Chest to floor', praise: 'Nice depth', tip: 'Lower until your chest is close to the floor.', kind: 'technique', priority: 4 },
    { id: 'hips-down', metric: 'hipOffset', stat: 'max', op: '>', value: 0.06, text: 'Hips down', praise: 'Nice straight line', tip: 'Bring your hips down so your body forms one straight line.', kind: 'technique', priority: 5 },
  ],
}
