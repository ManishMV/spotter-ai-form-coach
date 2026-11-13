# Spotter — AI Form Coach

**Live:** https://spotter-ai-form-coach.vercel.app

Spotter counts your reps and calls out form fixes, out loud, while you train. It runs in your
browser. There's no app or account, and your video never leaves your phone.

*Note: As a PM, I built this using Claude Code.*

> 🚧 v1 in progress (target: Nov 20, 2026). Pose tracking, the full UI and research-based squat
> counting are in place. Push-ups, spoken form cues and voice feedback are next. See [PLAN.md](PLAN.md).

## Why

Most people aged 18–30 who train without a personal trainer learn form from YouTube, and nobody checks
their reps. Mirrors, filming yourself or asking a friend are all inconsistent. Pose-tracking AI now
runs free inside any phone browser, so a private, real-time coach costs nothing to deliver.
Full brief: [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md).

## v1 scope

- Squat and push-up
- Live rep counting
- 2–3 form cues per exercise (e.g. depth, chest position, body line)
- Spoken feedback at the end of each rep, with a cooldown so it doesn't nag
- **Not in v1:** accounts, logging, uploads, paid AI APIs

## How it works

1. **See the body:** [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
   finds 33 body points in each camera frame, on-device. Laptops use the *full* model and phones use
   *lite*, with an automatic fallback to lite if frame rate drops below 20 fps.
2. **Measure:** knee, hip and elbow angles are computed from 3D points, on the side of the body
   facing the camera, and smoothed with the [1€ filter](https://gery.casiez.net/1euro/).
3. **Judge:** each exercise is one "rule pack" file (angle thresholds, rep rules, cues), so adding
   an exercise means adding one file. Squat rules come from NSCA/ACE research: see
   [docs/SQUAT-FORM.md](docs/SQUAT-FORM.md).
4. **Speak:** natural voice coaching from pre-recorded ElevenLabs clips (4 voices), played with short
   pauses between the rep number and the cue. Clips are generated once (`npm run voice:generate`) and ship
   with the app, so there are no API calls during a workout.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Motion · MediaPipe Tasks Vision · ElevenLabs (pre-generated voice) · Vercel

## Run locally

```bash
npm install
npm run dev          # laptop: http://localhost:5173
npm run dev:phone    # phone on same Wi-Fi (https, needed for the camera)
```

Add `?debug` to the URL for the raw tracking view (skeleton, angles, fps), `?lab` for the Test lab
(hear every voice line and play simulated sets without exercising), and `?model=lite` or `?model=full`
to force a model.

## Project docs

- [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md): who it's for, the problem, MVP, metrics
- [PLAN.md](PLAN.md): step-by-step build plan with a "done when" check for each step
