# Accuracy evals

A fixed set of labelled clips, run through Spotter's real tracking and rules, so every rule change can be
measured instead of guessed. It reports two kinds of mistakes separately:

- **False alarms:** good reps that weren't counted, or got a form fix. Testers complain about these.
- **Misses:** faulty reps that were counted with no fix. Nobody complains about these, so only the eval sees them.

**The rule:** a rule change ships only if it doesn't raise misses. Before changing a rule after a complaint, decide
which kind of problem it is:
- *Measurement:* the camera read the body wrong (tilted phone, hidden joint, jitter). Fix the reading, keep the standard.
- *Standard:* the rule itself is stricter than the sources. Change it only with a source and an eval result.

## 1. Record clips

About 20 clips (10 squats, 10 push-ups), 4 to 8 reps each, 10 to 30 seconds.

- **Mix devices and sides:** phone and laptop; facing left and facing right.
- **Mix good and bad reps on purpose.** Roughly half good, half faults, and several faults per clip is fine.
  - Squats: `half` (stop well above parallel), `chest` (lean the chest far forward), `hips` (hips shoot up first), `fast` (bounce out of the bottom).
  - Push-ups: `knee` (knees on the floor), `half` (only a quarter of the way down), `sag` (let the hips drop), `pike` (hips high), `bent` (don't straighten the arms at the top), `fast`.
- **Start and end calmly:** start recording, get into the start position (standing tall / plank with straight arms) and
  hold it about 2 seconds, do the reps, hold the start position again for 2 seconds, then stop. Walking up to the
  phone at the end can add a fake rep.
- **Format:** any phone video works (MP4 or MOV, HEVC included). Landscape for push-ups, like in the app.
- Put the files anywhere in `evals/clips/` (subfolders are fine), each with its own name. That folder is
  git-ignored: the clips never leave your laptop.
- `npm run eval` first makes eval-ready copies in `evals/clips/ready/` (H.264, upright, 720p, 30 fps, like a live
  camera feed) with `scripts/prepare_clips.py`. It needs ffmpeg (on PATH, or `pip install imageio-ffmpeg`) and only
  converts new or changed clips.

## 2. Label them

Fill in [`evals/labels.xlsx`](../evals/labels.xlsx) (one row per rep, label words in a drop-down). `npm run eval`
turns it into [`evals/labels.csv`](../evals/labels.csv), one line per clip: file, exercise, device, then every rep in order.

```
sq-01.mp4, squat, phone, good good half good chest
sq-02.mp4, squat, laptop, good half(stopped early, legs tired) good ? | dim room, facing left
pu-03.mp4, pushup, laptop, good knee(on purpose) knee good sag
```

- Every rep needs one label word: that's what gets scored.
- A note for one rep goes in brackets right after its word: `half(stopped early, legs tired)`.
- A note for the whole clip goes at the end after `|`.
- Not sure about a rep? Write `?`: it's lined up with Spotter's reps but not scored.
- Notes are shown next to Spotter's verdict in the report, so we can read them together.

Label what you actually did (your judgement, as if you were the coach), not what Spotter said. Labels:
`good half fast chest hips knee sag pike bent`, or `?`. A tablet counts as `phone`.

## 3. Run it

```
npm run eval
```

Opens the eval page; press **Run eval**. Each clip is played frame by frame through the same tracking, counting
and form rules as the live app (phones use the phone model, laptops the laptop model). It takes about as long as
the clips. **Copy report** gives a text version to paste below.

How a rep is judged:

| Label | Correct when Spotter… |
|---|---|
| `good` | counts it with no form fix (a minor tip is fine) |
| `half`, `knee` | doesn't count it |
| `fast` | doesn't count it, or says "Lower with control" |
| `chest` / `hips` | doesn't count it, or says "Keep your chest up" / the hips fix |
| `sag` / `pike` | doesn't count it, or says "Hips up" / "Hips down" |
| `bent` | doesn't count it, or gives the "Straighten your arms" tip |

Spotter's reps are lined up with the labels in order. A rep Spotter never registered is "not registered", and an
extra one (a wobble) is an "extra rep" or "extra message".

## 4. Results

### Baseline (Nov 18)
20 clips on one Android phone, one person (the builder), 79 labelled reps.

| | Squats | Push-ups |
|---|---|---|
| Good reps judged right | 13/26 (50%) | 11/28 (39%) |
| Faulty reps caught | 15/16 | 7/9 |
| False alarms | 13 | 17 |
| Misses | 1 | 2 |
| Reps not registered | 1 | 10 |

Known limits: pu-01 had the hands below the picture for most of each rep (a setup problem, which the live app
points out), so its 5 reps can't register. One person and one phone, so this is a starting point.

### Changelog
Every rule change: what changed, why, and the before/after numbers.

| Date | Change | Why | False alarms | Misses |
|---|---|---|---|---|
| Nov 18 | Push-ups: depth also reached with the elbow bent to under 100° (upper arm under 40°). "Hips up" only below -0.10 at the lowest point (was -0.06); "Hips down" on the typical reading over 0.08 (was the highest frame over 0.06). | With the phone on the floor, real 90° push-ups read the upper arm 21–27° from level, so reps weren't registered. Good reps dip to -0.095 and settle at the top, which fired the hip tips; real sag reps read -0.11 to -0.13. | Push-ups 17 → 9 | Push-ups 2 → 2 (sag still caught 2/2) |
| Nov 18 | Squats: "Keep your chest up" also needs the chest itself over 52° from vertical at the bottom (as well as 30° past the shins). | Facing left, the camera read the shins almost upright (8–12° vs ~20° facing right), so normal squats looked 30–39° past the shins. Good reps lean 33–49°, real chest drops 56–67°. | Squats 13 → 7 | Squats 1 → 1 (chest still caught 4/4) |

| Nov 18 | Push-ups: shortest counted rep 0.7 s (was 0.8 s). | Quick but full push-ups took 0.7–0.8 s and got "Slow down". Fast drops still get "Lower with control". | Push-ups 9 → 8 | Push-ups 2 → 2 |
The 5 remaining squat false alarms are sq-07, labelled good with a note that the chest was slightly forward:
those reps lean 59–64°, the same as the labelled chest drops, so the label is the likelier mistake.

Left for later (push-ups): two quick good reps in pu-08 still don't register; one knee push-up counted; the bent-arms rep isn't caught.
