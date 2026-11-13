# Go-to-market plan (v1 launch)

Goal: get Spotter in front of real people who train without a trainer, learn what they think, and
measure the funnel from first visit to finished set. Free channels only, no paid ads.

## Positioning

- **Who:** people who train without a personal trainer, especially when they're starting an exercise or
  unsure their form is right.
- **One line:** *A free AI form coach in your browser: it counts your squats and push-ups and tells you
  how to fix your form, out loud. Nothing to install, and your video never leaves your phone.*
- **Honest about v1:** an early side project. It starts with the two most common at-home exercises,
  squats and push-ups, and more exercises come next. Saying this up front sets expectations and invites
  feedback ("which exercise should be next?"), which is the point of the launch.

## What we need before posting

| Asset | Status | Notes |
|---|---|---|
| Tester round fixes (step 17) | To do | Don't launch with known bugs |
| Honest v1 note on the site | To do | Short line on the home page: early version, two exercises to start, more coming, plus a feedback link |
| Analytics with source tracking | To do | See below |
| Demo video, 15–30 s, plus a GIF (step 23) | To do | Made with an AI video tool, no filming. AI-made exercise clips are played through Spotter's own tracking (the step 21 eval tool), so the screen recording shows the real app coaching. Only clips that Spotter judges as good form are used |
| Post copy per channel | To do | Written per community, in Manish's voice |
| Feedback link on the site | To do | The same form, linked from the summary screen for everyone, not only testers |

## Channels, in order

**1. Reddit (first).** Read each community's rules before posting, ask the mods if unsure, and post in
the daily or weekly thread where self-promotion isn't allowed as a post.

| Community | Angle |
|---|---|
| r/formcheck | "A free tool that gives instant form feedback, for when there's no one to check" |
| r/bodyweightfitness, r/beginnerfitness, r/homegym | Training alone at home; asking which exercise to add next |
| r/SideProject, r/indiehackers | The build story: a PM building with AI tools, what worked |
| r/webdev (Showoff Saturday) | The tech: pose tracking that runs in the browser, nothing uploaded |
| Indian fitness communities | Local audience; Indian English coach voices |

How: post when Spotter is ready, lead with the video, say plainly that it's a free v1 side project and ask
for feedback, reply to every comment in the first few hours, and log what people say.

**2. WhatsApp communities (second).** Same message as for testers, adjusted per group. Warm audience,
quick replies.

**3. Later:** Show HN, Product Hunt, then LinkedIn and X once the case study is ready.

## Tracking

Three links, so each channel's results can be compared (every event carries `ref`):

| Link | `ref` in PostHog |
|---|---|
| `spotter-ai-form-coach.vercel.app` | `direct` |
| `spotter-ai-form-coach.vercel.app/?ref=reddit` | `reddit` |
| `spotter-ai-form-coach.vercel.app/?ref=whatsapp` | `whatsapp` |

Testers use `/?tester` (`ref` = `tester`). Our own checks use `/?ref=test` and are filtered out.

**Funnel:** visited → picked an exercise → started the camera → camera working → finished a set →
opened the feedback form. Split by source, device and exercise.

Tool: **PostHog** (free up to 1M events a month, strong funnel reports). Set up in `src/analytics.ts`: only the funnel steps are sent (`exercise_picked`, `set_start_tapped`, `camera_started` / `camera_failed`, `counting_started`, `set_finished`, `feedback_form_opened`), with no automatic click tracking, no session recording, no cookies, and never any video or names. It loads after the page, so the landing page stays fast.

## Success measures

| Measure | What it tells us |
|---|---|
| Visits per source | Which communities care |
| Visit → camera started | Does the pitch and setup page convince people |
| Camera started → finished a set | Does the product work in real rooms |
| Feedback form responses and comments | What to fix and build next |
| "Which exercise next?" answers | The roadmap, from users |

## Timeline

| When | What |
|---|---|
| Nov 14–17 | Tester round, eval videos, fixes |
| Nov 16–18 | Analytics, v1 note, demo video and GIF, post copy |
| Nov 18–20 | Reddit posts, one community at a time; WhatsApp after |
| After | Results written up for the case study |
