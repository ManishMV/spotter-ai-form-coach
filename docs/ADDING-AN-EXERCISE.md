# Adding an exercise

Every exercise in Spotter is one **rule pack**: a single file that describes how to count a rep and
what good form looks like. Everything else (the home card, setup screen, rep counting, coaching
cues, voice, sounds, the end-of-set summary and the settings) is shared and works for any rule pack.

## What you get for free

| Part | Comes from |
|---|---|
| Home card and setup screen | `name`, `summary`, `checks`, `camera`, `tips` in the rule pack |
| Rep counting, partial reps, "too fast" reps | `reps` in the rule pack, run by the shared rep counter |
| "Why didn't that count?" messages | `reps.requires` and `reps.partialText` |
| Form cues, praise and the anti-nagging rules | `cues`, run by the shared feedback policy (safety on the first rep, technique after a pattern, minor only if it keeps happening) |
| Spoken cues in all four coach voices | Generated from the rule pack's text: `npm run voice:generate` makes only the new clips |
| End-of-set summary and "Next time" tip | `cues[].tip`, weighted by risk |
| Settings (rep target, coaching level, voice) | Shared, saved per exercise for the day |

## Steps

1. **Research the standard.** Find what counts as a rep and the common faults from trusted sources
   (NSCA, ACE, ACSM, peer-reviewed research). Write it up in `docs/<EXERCISE>-FORM.md`, with the numbers and
   sources, like [SQUAT-FORM.md](SQUAT-FORM.md) and [PUSHUP-FORM.md](PUSHUP-FORM.md).
2. **Write the rule pack:** `src/exercises/<exercise>.ts` (shape in [types.ts](../src/exercises/types.ts)).
   Reuse the body measurements Spotter already tracks (knee, hip, elbow, torso lean, body line, thigh tilt
   and more). A new measurement is only needed if the movement can't be judged with these, and it goes in
   `src/coach/angles.ts`.
3. **Add one line** to the list in `src/exercises/index.ts`. The exercise now appears on the home screen.
4. **Make the voice clips:** `npm run voice:generate` (only new lines cost anything).
5. **Add a demo and set-up drawing:** a pose function in `src/components/ExerciseDemo.tsx` (the looping
   "A good rep" figure) and a figure in `src/components/SetupIllustration.tsx`.
6. **Test without exercising:** add simulated sets to `src/lab/simulate.ts` (clean reps plus each fault)
   and check them in the Test lab (`?lab`). They run through the real counting and coaching code.
7. **Test for real:** a few sets on camera, then add recorded clips to the accuracy evals.

## Example: a reverse lunge, sketched

```ts
export const lunge: Exercise = {
  id: 'lunge',
  name: 'Reverse lunge',
  summary: 'Bodyweight. Side view.',
  checks: ['Depth', 'Upright torso'],
  camera: { height: 'hip', distance: { laptop: '2–3 m', phone: '1.5–2 m' } },
  mustSee: ['shoulder', 'hip', 'knee', 'ankle'],
  tips: ['Stand side-on to the camera', 'Whole body in frame'],
  reps: {
    metric: 'knee', // front knee: ~90° at the bottom
    downBelow: 100,
    upAbove: 150,
    minRepMs: 1000,
    partialBelow: 140,
    partialText: 'Lower your back knee',
    startText: 'Stand tall to start',
  },
  cues: [
    { id: 'upright', metric: 'torsoLean', stat: 'max', op: '>', value: 30, text: 'Keep your chest up',
      praise: 'Nice posture', tip: 'Keep your chest tall as you step back.', kind: 'technique', priority: 1 },
  ],
}
```

That's the whole exercise: counting, coaching, voice and summary all come from the shared code. The
numbers above are placeholders until step 1 is done properly.
