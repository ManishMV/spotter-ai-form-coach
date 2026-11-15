# Tester round (step 17)

Real people, real rooms, real devices: does Spotter count and coach accurately, and does it help?

## How it runs

- **Testers:** 3–5 people who train without a personal trainer.
- **Task:** one set of 10 squats and one set of 10 push-ups, rep target set to "None". They count their own reps (or a friend counts).
- **Link:** https://tryspotter.vercel.app/?tester. Tester mode adds a "Copy results and open the form" button to the summary screen: it copies every set from the visit as plain text and opens the feedback form, so testing and feedback are one flow. Nothing is uploaded and nothing personal is included.
- **Form:** https://forms.gle/QqekwL1zz9d9yUGK8. Name, device, actual rep counts, the pasted results, and questions on tips, smoothness, set-up, how they check form today and whether Spotter helped. About 2 minutes.

## How the numbers are worked out

| Metric (from the product brief) | How | Target |
|---|---|---|
| Rep-count accuracy | Reps counted ÷ reps actually done, per exercise (from the pasted results and the tester's own count) | 90%+ |
| Form-cue accuracy | Share of testers answering "Yes, spot on" or "Mostly" to "Were the form tips right?", plus the wrong-tip comments | Real mistakes flagged, few false alarms |
| Device performance | Smooth = 20+ fps in the pasted results and "Yes" or "Mostly" to "Did the tracking feel smooth?" | Smooth on most test devices |
| Helped with form | Share answering "Yes, it caught something to fix" or "It confirmed my form is good" | Most testers |

## Results

Form responses so far (first round, Nov 14). Testers are lettered here because this file is public; names are kept privately.

| Tester | Device | Squats: done / counted | Push-ups: done / counted | fps | Tips right? | Smooth? | Set-up (1–5) | Checks form today with | Helped? |
|---|---|---|---|---|---|---|---|---|---|
| A | Phone (Nothing 2a) | – | 15 / (not pasted) | – | Yes, spot on | Yes | 5 | Mirror | Caught something to fix |
| B | Tablet | 5 / 5 | – | 12 | Yes, spot on | Yes | 5 | Mirror | Caught something to fix |
| C | Phone (Pixel 7) | 10 / 10 | 10 / 10 | 35 squats, 25 push-ups | Mostly | Yes | 4 | YouTube / social | Confirmed form is good |
| D | Phone (Realme 12+) | 10 / (not pasted) | – | – | Yes, spot on | **No** | 5 | YouTube / social | Caught something to fix |

**From PostHog (Nov 13–14, tester and direct links, excluding Manish's `test` runs):**
- **Tester-link funnel:** 43 visitors → 26 picked an exercise (60%) → 20 tapped Start → 16 camera on → 12 reached "Go" → 12 finished a set → 8 opened the feedback form → 4 submitted it.
- **Sets finished (tester + direct links):** 23 sets, 115 reps counted, 70 with good form (61%), 42 attempts that didn't count.
  - Squats: 14 sets, 72 reps, average 44 fps (mostly laptops).
  - Push-ups: 9 sets, 43 reps, average **11 fps** (all phones, lite model): smoothness on phones needs work.
- **Camera problems:** 1 tester dismissed the camera permission on a phone (trust); 14 "could not start video source" errors were one laptop with the camera busy in another app.

**Scores so far:** rep accuracy **25 / 25 (100%)** where testers pasted results (B and C); tips right or mostly right **4 / 4**; helped with form **4 / 4**; felt smooth **3 / 4**.

## Observations log

What testers said and did, as it happens (dates, rough numbers, direct quotes when possible). Feeds the case study.

| Date | What happened | How many | Notes / what it suggests |
|---|---|---|---|
| Nov 14 | Push-ups wouldn't start until a tester switched auto-rotate on; it took time to read the on-screen hint. Suggested the coach say it out loud at the start. | 1 (C) | Say the auto-rotate tip in the voice line and add it to the push-up quick check on phones. |
| Nov 14 | Every push-up of one tester got "Straighten your arms at the top", while the reps counted fine and he answered "tips mostly right". | 1 (C) | The lockout tip (elbow under 155°) is too sensitive on phones; loosen it or make it minor. |
| Nov 14 | Push-ups on phones ran at about 11 fps on average; one tester said tracking didn't feel smooth. | 9 sets / 1 tester | Phone performance for push-ups needs tuning (lite model, camera resolution). |
| Nov 14 | Testers opened the form but only half submitted; some pasted a rep count instead of their results. | 8 opened, 4 submitted | Shorter form, results pre-copied (done), clearer results question. |
| Nov 14 | Some friends hesitated to try it, worried their video would be recorded or sent to Manish. Stronger among women. | _a few of the first ~N asked_ | Camera trust is a real barrier, even with privacy stated on the site. Ideas: skeleton-only mode (hide the camera picture), "works offline once loaded" proof (test first), visible open-source link, a "processing on this device" badge on the live screen, a watch-only demo before the camera, named social proof. |

## Summary

_To fill in after the round: the four metrics, what testers asked for, and what changes as a result._
