# Push-up form rules — what Spotter checks and why

Spotter sees the user **from the side**, with the phone or laptop on the floor 1.5–2 m away, and
gets body points from MediaPipe. Researched Nov 12, 2026.

**Elbow angle** = inside angle shoulder–elbow–wrist (180° = straight arm).
**Upper-arm angle** = shoulder→elbow line vs horizontal (90° = arm vertical, 0° = upper arm parallel to the floor).
**Body line** = inside angle shoulder–hip–ankle (180° = straight plank).

## Rules

| What | Why it matters | How Spotter measures it (side view) | Threshold | Status | Source |
|---|---|---|---|---|---|
| **Depth: upper arm parallel to the floor** | Half reps are the #1 progress fault | Lowest **upper-arm angle** in the rep (shoulder drops to elbow level) | Counts if < **20°** from parallel. Below 45° but not 20° = partial rep → **"Chest to floor"** | ✅ Built | FitnessGram, USMC ("upper arm parallel to the floor"); CSEP/ACSM/ACE (chest to fist or floor). Switched from elbow angle after testing: elbow angle at full depth changes with hand position (under the shoulders vs back near the chest); upper-arm angle doesn't |
| **Lockout: arms straight** | A rep ends at full extension | Highest elbow angle in the rep, top included | > **150°** → else **"Straighten your arms at the top"** | ✅ Built | ACE; CSEP; Army hand-release push-up guidance (counters use 145–160°) |
| **Key points in view** | Can't judge depth, lockout or knees from parts we can't see | Shoulder, elbow, wrist, hip and knee (camera side) inside the picture; feet may be cut off | Any missing → counting pauses, **"Move back so your whole body is in view"** | ✅ Built | Added after testing: a knee just out of frame made the knee check guess |
| **In a plank** | Bending your arms while standing or kneeling isn't a push-up | Torso tilt from vertical (median over the rep) | Must be > **50°** (body near horizontal) → else **"Get into a plank"** | ✅ Built | Derived from plank geometry (top ≈ 20–25° from horizontal) |
| **Full push-up, not knees** | Different exercise, different standard | **(1) Knee off the floor:** knee height above the hands (= floor level) at the top, ÷ thigh length; needs only knee + wrist. **(2) Legs straight:** knee angle, when the ankle is visible | Knee lift > **0.2** (full ≈ 0.4, knees down ≈ 0.1) and knee > **150°** → else **"Knees up for full push-ups"** | ✅ Built | ACSM/CSEP use knee push-ups as a separate test, so they get a separate mode later. Knee-lift check added so feet can be out of frame |
| **Body straight** | Sagging hips stress the lower back; piking dodges the work | Body line (median) | Must be > **155°** (research suggests ~160°) → else **"Keep your body straight"** | ✅ Built | ACE; Army ("rigid torso, no sag or pike") |
| **Controlled tempo** | Bouncing isn't a controlled rep | Rep duration | ≥ **0.8 s** → else **"Slow down"** | ✅ Built | Test cadences are 2.4–3 s per rep (FitnessGram 20/min; beep test 25/min). No published minimum exists; 0.8 s is our cutoff for bounces and glitches, well below those cadences. |
| **Controlled descent (coaching)** | Dropping fast to the floor | Time from the top to the deepest point | Under **0.4 s** → **"Lower with control"** (the rep still counts) | ✅ Built (Step 10) | Our judgement, based on the cadences above |
| **Don't rest on the floor (coaching)** | Collapsing at the bottom instead of holding the plank | Time with the shoulders well below the elbows (upper arm > 15° past parallel) | Over **0.8 s**, and in 3 of the last 4 reps → **"Stay off the floor"** (the rep still counts) | ✅ Built (Step 10) | "Don't collapse onto the floor" is common coaching guidance; time limit is our judgement so a quick chest-to-floor touch never triggers it |
| **Hips up / hips down** | Finer sag vs pike feedback | Hip above or below the shoulder–ankle line, ÷ body length | Beyond **±0.06** (≈ body line 165°) → **"Hips up"** (sag) or **"Hips down"** (pike) | ✅ Built (Step 10) | ACE; Army; NASM |
| **Chest to floor (coaching)** | Counted, but only just reached depth | Upper arm still > **10°** above parallel at the bottom | → **"Chest to floor"** | ✅ Built (Step 10) | NASM ("lower until the chest nears the floor") |

## Deliberately *not* checked

| What | Why not |
|---|---|
| Hand width, elbow flare | Only visible from the front. |
| Hand position front-to-back | Both "under the shoulders" and "slightly back, near the chest" are valid; depth is judged by the upper arm, so either works. |
| Head position | No standard gives degrees, and ear points are noisy. Better as an after-set tip than a live cue. |

## Lessons carried over from squats
- **Medians, not single frames:** a brief tracking error can't fail a rep.
- **Only the side facing the camera** is measured and drawn; the far arm is hidden and guessed.
- **Facing the camera pauses counting.** Facing vs side-on is checked only at the top of a rep (arms straight), because hidden points drift mid-rep.
- **Glitch filter:** under 0.35 s is ignored silently; real but rushed reps get "Slow down".

## Where sources disagree
- **Depth:** CSEP, ACSM and ACE want the chest to reach a fist or block; FitnessGram and USMC accept a 90° elbow. We use 90° (plus noise allowance).
- **Lockout:** most say fully extend; pose counters use 145–160°, not 180°.
- **Knees:** ACSM and CSEP accept knee push-ups with separate norms; Army and FitnessGram don't.

## Cues
See [COACHING.md](COACHING.md) for cue wording, priority and how often Spotter speaks.

## Sources
- ACE / CSEP-PATH push-up assessment protocol. https://contentcdn.eacefitness.com/assets/certification/ace-answers/forms/pt/36_Push-up_Assessment_Protocol.pdf
- ACE Exercise Library: push-up.
- Topend Sports: push-up test and cadence/beep push-up tests (FitnessGram cadence). https://www.topendsports.com/testing/tests/pushup.htm
- ACFT hand-release push-up arm extension. https://www.dummies.com/article/acft-event-hand-release-push-up-arm-extension-283771
- ACSM push-up test (via Gustavus Adolphus College HES lab). https://gustavus.edu/hes/hplab/acsmpushup.php
- Cogley RM et al. (2005). Hand position and push-up muscle activation. https://www.proquest.com/docview/213066347
- Pose-estimation push-up counters (thresholds used in practice): Labellerr blog; MediaPipe push-up analysis by N. Palem. https://niharpalem.substack.com/p/push-up-form-analysis-using-mediapipe

Thresholds marked as tuned (20° upper-arm depth, 155° body line, 50° plank gate) are engineering judgment based
on the sources. They'll be checked against real tester data in Step 17.
