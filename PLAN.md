# Spotter (AI Form Coach) — Build Plan (v1, due Nov 20, 2026)

Read [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md) first. Every step below is under 1 hour, ends with a
"Done when" check I run by hand, and gets its own git commit.
Build one step at a time. Do not start the next step until the current one is checked.

---

## Libraries (picked with search-first, Nov 11)

| Need | Decision | Why |
|---|---|---|
| Pose tracking | **Adopt** `@mediapipe/tasks-vision` (Pose Landmarker **lite** model) | Google's official package, updated this week, runs fully in the browser. Also ships `DrawingUtils` for skeleton drawing, so no extra library. |
| App framework | **Adopt** React 19 + TypeScript + Vite 8 | As requested. Fast dev server, deploys to Vercel with zero config. |
| Styling | **Adopt** Tailwind CSS v4 (`@tailwindcss/vite`) | As requested. v4 needs no config file. |
| Motion | **Adopt** `motion` (the new name of Framer Motion, same team, same API via `motion/react`) | `framer-motion` still works but `motion` is the current package. |
| Camera | **Build** (≈20 lines, browser `getUserMedia`) | `react-webcam` hasn't been updated since 2023; we need fine control for phones anyway. |
| Speech | **Build** thin `voice` module on the browser's `speechSynthesis` | `react-speech-kit` abandoned (2022). We need our own interface anyway so ElevenLabs clips can swap in later. |
| Angles + rep counting | **Build** (small, pure functions) | No maintained library fits; the math is a few lines (angle between three points + a two-state counter). |

---

## How the code is organised (target shape)

```
src/
  pose/        camera.ts, landmarker.ts, drawSkeleton.ts   ← "see the body"
  coach/       angles.ts, repCounter.ts, cueEngine.ts      ← "judge the body"
  exercises/   squat.ts, pushup.ts, types.ts               ← one rule pack per exercise
  voice/       index.ts (interface), browserVoice.ts       ← swappable voice layer
  screens/     Home.tsx, Setup.tsx, Workout.tsx            ← the 3 screens
```
Adding an exercise = adding one file in `exercises/`. Swapping the voice = one new file in `voice/`.

---

## How each step is tested

- **Test lab (`?lab`)** for anything that doesn't depend on camera tracking: voice lines, wording, timing,
  coaching settings and feedback rules. It plays every voice line on demand and runs scripted, simulated sets
  through the real counting and coaching code.
- **Real exercise** only when tracking or rule thresholds change, since those need a real body in front of the camera.
- Plus automated simulations during development (synthetic angle sequences through the same code).

## Steps

> **Order change (Nov 12):** design is deferred, so the build order is now
> 1 → 1b → 2 → **6 → 7** → 3 → 4 → 5 → 8 → 9 … Steps 6–7 (angles, rep counting) only need a
> temporary debug readout, not designed screens. Step numbers are kept so commits stay traceable.
>
> **Update (Nov 12):** design pulled forward. Steps 3–5 built together: Spotter name,
> supermemory.ai-inspired look (Geist fonts, hairlines, square corners, dotted grids) with Spotter-orange
> accent, light + dark mode. Home doubles as the landing page. Workout screen layout (part of Step 8) done;
> the old tracking test view lives at `?debug`. Hosting (Step 13) moves up: GitHub for code + Vercel.

### Step 1 — Camera on, skeleton drawn on me (laptop)
- Scaffold Vite + React + TS + Tailwind + motion. Init git.
- Open the webcam, load Pose Landmarker lite, draw the skeleton over the live video.
- Plain, unstyled page — design comes in Step 3.
- **Done when:** `npm run dev` → open the link on the laptop → allow camera → a skeleton follows your body smoothly (no freezing) when you move your arms.

### Step 1b — Tracking tune-up (added Nov 12)
- Use the more accurate **full** pose model on laptops, **lite** on phones. If full runs below 20 fps, switch to lite automatically.
- Ignore weak detections (raise confidence thresholds from 0.5 to 0.6).
- Hide body points the tracker isn't sure about, so the skeleton only shows what it can really see.
- Debug readout shows fps + which model is running. `?model=lite` or `?model=full` in the URL forces one, for testing.
- **Done when:** laptop shows "full" at ≥ 20 fps; with `?model=lite` it still works; covering your legs with a desk hides the leg points instead of drawing guesses.

### Step 2 — Same thing on my phone (early phone check)
- **Status (Nov 12):** built (`npm run dev:phone` → https link on Wi-Fi). Phone test still pending.
- Let the phone open the laptop's dev server over Wi-Fi with https (cameras need https on phones).
- **Done when:** the phone (same Wi-Fi) opens the link, shows the camera and draws the skeleton. From here on, every "done when" is checked on the phone too.

### Step 3 — Design direction + design tokens
- Define colours, fonts and the 3 screens.
- Put the colours, font and spacing into one theme file (Tailwind `@theme`). Dark-first, so it works in a dim gym.
- **Done when:** the direction is signed off, and a test page shows the font, the accent colour and the big rep-number style.

### Step 4 — Home screen: pick an exercise
- One screen, two large choices: Squat, Push-up. Nothing else.
- **Done when:** both choices are tappable on the phone and the laptop.

### Step 5 — Setup screen: where to put the phone + big Start
- Simple side-view illustration (phone height and distance come from the exercise's rule pack, so push-up and squat can differ).
- One huge Start button. The tap starts the camera, says a short "Ready" out loud (unlocks sound on iPhone) and keeps the screen awake.
- **Done when:** on the phone, tapping Start opens the camera with the skeleton and you hear "Ready"; nothing plays before the tap.

### Step 5b — Device-aware setup screen (added Nov 12)
- **Status (Nov 12): ✅ passed** — laptop and phone versions, switch link, and the workout view now shows the full camera frame (no cropping on wide screens).
- Detect laptop vs phone/tablet automatically (no extra question). Laptop: laptop-on-a-table drawing + "Laptop at about hip height, on a table or shelf". Phone: current phone-on-stand drawing.
- Small "Using a phone instead?" / "Using a laptop instead?" link to switch if the guess is wrong.
- **Done when:** laptop shows laptop instructions, phone (or devtools phone view) shows phone instructions, the switch link flips them.

### Step 6 — Joint angles, smoothed, live readout
- **Status (Nov 12): ✅ passed** — steady 170–180°, squat < 100°, side label switches. Found: facing the camera still shows a side → handled in Step 12.
- `coach/angles.ts`: angle at a joint from three body points. Use the body side the camera sees best, and show which side it picked.
- Smooth the points over a few frames so numbers don't jitter.
- **Done when:** standing still, the knee angle stays within ±5°; a deep squat shows < 100°; turning around switches the side label.

### Step 7 — Rule-pack format + squat rule pack + rep counter
- **Status (Nov 12): ✅ passed** — 10/10 twice. Found: far-side leg drawn in wrong places when hidden; lunges/split stance still count as squats → fixed in Step 7b.
- `exercises/types.ts`: everything a rule pack can contain — angle to watch, separate "down" and "up" thresholds (a gap so jitter can't double-count), camera hint, and cue checks (e.g. torso lean, body line). Defined fully now so later exercises don't change it.
- `exercises/squat.ts` and `coach/repCounter.ts`.
- **Done when:** 10 real squats → counter shows 10, twice in a row.

### Step 7b — Research-based squat rules + cleaner skeleton (added Nov 12)
- **Status (Nov 12): ✅ passed** — squats count on both sides, lunges rejected on both sides. Lunge check uses two signals (feet split + balance) because the hidden foot is mis-guessed facing right. Found: squats facing the camera still count → Step 12a.
- Squat rules from NSCA (Myer 2014), ACE and biomechanics research → [docs/SQUAT-FORM.md](docs/SQUAT-FORM.md).
- Counts only at about parallel (knee < 100°) and full stand (> 160°), ≥ 1 s per rep.
- Not counted, with a reason on screen: lunge / split stance ("Feet side by side"), partial rep ("Go deeper"), bouncing ("Slow down").
- Skeleton draws only the side facing the camera (the hidden leg was being guessed).
- **Done when:** 10 good squats → 10; 3 lunges → 0 + "Feet side by side"; 3 half squats → 0 + "Go deeper"; no phantom leg behind you.

### Step 12a — "Turn to your side" (on-screen part of Step 12, pulled forward Nov 12)
- **Status (Nov 12): ✅ passed** — facing the camera doesn't count; side-on counts on both sides. Facing is decided only while upright (the hidden shoulder drifts at the bottom of a squat).
- Detect facing the camera (shoulders look wide) vs side-on (shoulders overlap). Pause counting and show "Turn to your side"; resume when side-on.
- **Done when:** squatting while facing the camera never counts and shows "Turn to your side"; turning side-on resumes counting.

### Step 8 — Workout screen
- Full-screen camera, one huge rep number, one cue line, a small "End" control.
- **Done when:** standing 3 m from the phone/laptop you can read the rep number without squinting, and it counts correctly.

### Step 9 — Push-up rule pack
- **Status (Nov 12): ✅ passed** — rules from ACE, CSEP/ACSM, FitnessGram and USMC standards ([docs/PUSHUP-FORM.md](docs/PUSHUP-FORM.md)). Depth by upper-arm angle (works with any hand position), lockout, plank, knees off the floor, body line, tempo. Counting pauses when key points are out of frame.
- `exercises/pushup.ts` only (proves "new exercise = one file").
- **Done when:** 10 push-ups → counter shows 10, and the only other change is adding it to the exercise list.

### Step 10 — Form cues (text)
- **Status (Nov 13): ✅ passed** — research-based cues for both exercises, weighted by risk (safety / technique / minor), with praise and anti-nagging rules. See [docs/COACHING.md](docs/COACHING.md).
- `coach/cueEngine.ts`: at the end of each rep, check the rule pack's cues and show the single most important one.
- Squat: not deep enough, chest dropping forward. Push-up: hips sagging, not going low enough.
- Note (Nov 12): shallow reps never pass the "down" threshold, so they aren't counted. Detect these as **partial reps** (went partway down and came back up) so "Go deeper" still fires for them.
- **Done when:** a deliberately shallow squat shows "Go deeper"; 10 normal good reps trigger at most 1 false alarm.

### Step 10b — Built for distance: coaching setting, details switch, countdown (added Nov 13)
- **Status (Nov 13): ✅ passed** — each coaching mode shows only its cues, details switch works, counting starts at "Go", choices remembered after reload.
- Users will usually be 2–3 m from the device, so the screen is secondary and mid-set taps aren't possible.
- Setup screen: **Coaching** = All cues / Safety only / Off (no-reps and position prompts always on), and **Show details** (live angles). Saved **per exercise** and kept **for the day** (back to defaults after midnight).
- 5-second **start countdown** after tapping Start, so there's time to walk back before counting begins.
- Push-ups on a phone: tip to turn the phone sideways (a lying body fits a landscape frame from closer).
- **Done when:** each coaching mode shows only its cues; details switch hides/shows the angles; counting starts only after "Go".

### Step 11 — Spoken cues (swappable voice)
- **Status (Nov 13): ✅ passed** — spoken countdown, rep chime and number, cues in one phrase, a separate sound and spoken reason when a rep doesn't count, spoken positioning prompts, "Count reps out loud" switch. Tested in the Test lab (`?lab`).
- `voice/index.ts` defines `speak(cueId, text)`; `voice/browserVoice.ts` uses the browser's speech (waits for voices to load).
- Speak only at the end of a rep, max once every ~4 s, never the same cue twice in a row.
- Distance-first audio: optional **rep count out loud** ("one, two…"), a short **sound per rep** and a different one for a **no-rep**, spoken **no-reps**, **position prompts** and **form cues** (following the coaching setting), spoken countdown.
- **Done when:** on the phone you hear cues while squatting, it never talks over itself, and switching voice means editing one import line.

### Step 11b — Natural voice: ElevenLabs clips, 4 voice options (added Nov 13)
- **Status (Nov 13): ✅ passed** — 4 voices (Arjun, Meera, Max, Ava) picked by ear from a shortlist of the library's most-used Indian and American English voices; delivery = Eleven v4 + tone hints, picked from 4 styles compared by ear. 324 clips, silence trimmed, 300 ms pause between number and cue. Coach voice picker with preview on the setup screen.
- Browser speech sounded robotic, with no natural pauses ("Six chest up"). Replace it with **pre-recorded ElevenLabs clips**:
  every line Spotter can say (~90) is generated once and shipped with the app. No API calls while working out,
  no per-user cost, works offline, so it stays within the brief's "no paid AI APIs" (no runtime calls).
- Lines are played as separate clips with a short **natural pause** between them ("Six." … "Chest up.").
- **4 voice options** with our own names (Indian male, Indian female, a calm British "Jarvis-type" male and female), picked by the user.
- Any line without a clip falls back to browser speech, so nothing goes silent.
- One command regenerates clips: `npm run voice:generate` (API key stays in the git-ignored `.env.local`).
- **Done when:** every line plays as a natural clip in all 4 voices in the Test lab; a simulated set sounds human, with pauses between number and cue.

### Step 12 — Positioning guidance ("Can't see you"), shown + spoken
- Detect when the user is **facing the camera** (not side-on): show "facing" instead of a side, pause counting.
- Detect when they're **too close / too far / partly out of frame**.
- Show one prompt at a time and **speak it** via the voice module (Step 11): "Turn to your side", "Step back a little", "Come a little closer". Same cooldown rules as cues, so it doesn't nag.
- **Done when:** facing the camera → "Turn to your side" (heard + shown) and counting pauses; walking too close / out of frame → the right prompt; returning side-on in frame → prompt clears and counting resumes.

### Step 13 — Deploy to Vercel
- **Status (Nov 12):** live at https://spotter-ai-form-coach.vercel.app. Code at github.com/ManishMV/spotter-ai-form-coach.
  Vercel is connected to GitHub, so every push to `main` updates the live site automatically. Remaining: the phone check below.
- Push to GitHub, connect Vercel.
- **Done when:** the Vercel link works on your phone on mobile data (not your Wi-Fi): Start → camera → reps count → cue spoken.

### Step 14 — Speed pass on phones
- **Status (Nov 13):** built and live (smaller phone camera feed, breathing room on slow devices, analysis time shown). Phone test pending.
- Use the phone's graphics chip when available, fall back if not; skip frames if the phone is slow.
- **Done when:** a frame-rate readout shows ≥ 20 fps on your phone and a second, older phone runs without freezing.

### Step 15 — End-of-set screen
- **Status (Nov 13): ✅ done** — reps and time, the one issue to work on (weighted by risk, with a plain tip), reps that didn't count and why, Done / Go again. Closing line: Great set / Nice work / Good effort / Good start. Checked in the Test lab.
- After "End": reps done and the one cue to work on next time. One button: "Go again".
- **Done when:** finishing a set shows the summary and "Go again" returns to Setup.

### Step 16 — Polish pass (make-interfaces-feel-better)
- Includes a more polished look for the tracking points and skeleton overlay.
- **Done when** all 5 are true: (1) rep number animates on each rep, (2) screen changes slide/fade under 300 ms, (3) every tap target ≥ 44 px, (4) all text readable on the camera feed, (5) light and dark phone settings both look right.

### Step 15b — Hands-free end: rep target + inactivity
- **Status (Nov 13): ✅ done** — plus a quieter voice: one short line per rep, numbers off by default, target countdown only while resting, ranked speech with breathing room.
- Optional **rep target** on the setup screen (None / 5 / 10 / 15 / 20). Near the end: "Three more", "Two more",
  "Last one"; the set finishes by itself on the target. Only reps that count move towards it.
- **Inactivity:** about 12 s without a rep (never mid-rep, never before the first rep) → "Finishing the set… 3, 2, 1"
  → summary. Any rep cancels it. End can still be tapped any time.
- **Done when:** a target of 5 ends on the fifth good rep with the countdown heard; stopping early finishes after the
  warning; pauses during a normal set never end it. (Checkable in the Test lab without exercising.)

### Step 15c — User-ready mode
- Joint-angle details hidden by default for real users (they stay one switch away, and on for demos).
- **Done when:** a fresh visit shows no angle box; the switch brings it back.

### Step 19 — Push-up head-position tip
- Head drop / forward head (NASM; Myer: neck in line with the torso). Ear points are noisy, so this is an after-set tip, not a live cue.
- **Done when:** a set with the head dropped gets the tip on the summary; a neutral head doesn't.

### Step 20 — Exercise demo before starting
- Short animated skeleton demo of a good rep on the setup screen (built in code, on-brand, works offline). Filmed demos later.
- **Done when:** both exercises show a looping demo that matches the rules (depth, body line).

### Step 21 — Accuracy evals on recorded video
- Run the app on recorded clips instead of the live camera, to measure rep and cue accuracy repeatably.
- **Done when:** a set of labelled clips produces a rep-accuracy and cue-accuracy report (the brief's 90% target).

### Step 22 — Less space needed
- Test how close "close enough" is now that feet can be out of frame for push-ups; update setup distances.
- **Done when:** the setup screen's distances are the smallest that still pass the in-view and accuracy checks.

### Step 23 — AI demo video (marketing)
- A short launch video for the home page, README and portfolio, made with an AI video tool (Higgsfield, Runway, Veo or Kling; pick after comparing price and quality). Marketing only, not for teaching form: AI video can get body positions slightly wrong.
- Mix AI-made scenes (someone training at home with a laptop or phone) with real screen recordings of Spotter counting and coaching.
- Before using any AI-made exercise clip, run it through Spotter's own tracking: only clips that count correctly and get no form cues make the cut.
- Made after polish (16) and less space (22), so the video shows the finished app.
- **Done when:** a 30–60 s video is on the home page and in the README, and every exercise clip in it passed Spotter's check.

### Step 17 — Tester round + metrics
- Recruit 3–5 testers by **Nov 14**. Each does 10 squats + 10 push-ups.
- `TESTING.md` template: rep accuracy = counted ÷ real reps; cue accuracy = correct cues ÷ cues shown; "smooth" = ≥ 20 fps with no freeze; reuse = "would you use it again?" yes/no.
- **Done when:** `TESTING.md` has results for every tester and the four brief metrics are filled in.

---

## Later
- Knee push-up mode: a separate exercise file with the same rules, body line measured shoulder → hip → knee (ACSM/CSEP modified push-up). v1 stays at two exercises.
- Filmed exercise demos (step 20 starts with an animated one).
- More exercises (one rule-pack file each).

## Schedule guide
Done by Nov 13: 1–2, 3–10b, 11, 12a, 13 (live). Remaining, in order: 11b voice → 14 phone speed → 15 summary → 15b hands-free end → 19 head tip → 20 demo → 21 evals → 16 polish → 22 less space → 23 AI demo video → 17 tester round (recruit testers now).
