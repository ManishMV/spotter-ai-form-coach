# Squat form rules — what Spotter checks and why

Spotter sees the user **from the side** and gets body points from MediaPipe. Every rule below
is something we can measure from that view. Researched Nov 12, 2026.

**Knee angle** = the inside angle at the knee (hip–knee–ankle). 180° = straight leg.
(Research papers often use *flexion* = 180° − this.)

## Rules

| What | Why it matters | How Spotter measures it (side view) | Threshold | Status | Source |
|---|---|---|---|---|---|
| **Depth: thighs at least parallel** | Main driver of progress; shallow reps are the #1 beginner fault | Lowest knee angle in the rep | Counts if < **100°**. Went below 140° but not 100° = partial rep → **"Go deeper"** | ✅ Built (Step 7b) | Myer et al. 2014 (NSCA); Straub & Powers 2024 |
| **Stand fully back up** | A rep ends at full hip and knee extension | Knee angle back above | > **160°** | ✅ Built | Myer 2014; common rep-counter practice |
| **Feet side by side (not a lunge)** | A squat has both feet level; one foot forward = lunge or split squat | Two signals, both must say "lunge" to reject: **(1)** front-to-back gap between ankles ÷ leg length; **(2)** balance = shoulder vs visible ankle ÷ leg length (in a squat the shoulders stay over the feet) | Lunge if median gap > **0.35** (research: 0.30) **and** median balance > **0.30** | ✅ Built | Myer 2014; ACE; split-squat step length 85–130% of leg length (Frontiers 2023). Two-signal design added after testing: the hidden far foot is mis-guessed at the bottom of a deep squat when facing right |
| **Controlled tempo** | Dropping or bouncing into the bottom isn't a controlled rep | Rep duration | ≥ **1.0 s** | ✅ Built | Myer 2014 (descent 2–4× longer than ascent, moderate pace) |
| **Chest up: torso roughly parallel to shins** | Too much forward lean loads the lower back | Torso lean vs shin lean at the bottom | Cue if torso leans > **20°** more than the shin → **"Chest up"** | ⏳ Step 10 | Straub & Powers 2024; Myer 2014; ACE; NASM |
| **Heels stay down** | Heel lift = balance and ankle-mobility problem | Heel height vs toe, compared with standing | Lift > ~2 cm or > 8° → **"Heels down"** | ⏳ Step 10 | Myer 2014; ACE |

## Deliberately *not* checked

| What | Why not |
|---|---|
| Knees going past toes | Current evidence says it's fine if heels stay down; restricting it shifts load to hips and back (Myer 2014; Fry et al. 2003). |
| Knees caving in (valgus) | Only visible from the front. |
| Lower-back rounding ("butt wink") | MediaPipe has no points on the lower spine, so we can't see it reliably. |

## Where sources disagree
- **Knee travel:** Schoenfeld 2010 says limit it; Myer 2014 and Fry 2003 say don't.
- **Stance width:** Myer says heels shoulder-width; ACE says slightly wider than hips.
- **Depth:** Myer says at least parallel; ACE says stop earlier if heels lift or the back rounds.
- **Torso angle:** no fixed number, because it depends on body proportions. That's why we compare the torso with the shin instead.

## Spoken cues (Step 10–11), in priority order
1. **"Go deeper"**: not reaching parallel
2. **"Chest up"**: torso leaning too far forward
3. **"Heels down"**: heels lifting

## Sources
- Myer GD et al. (2014). *The back squat: a proposed assessment of functional deficits and technical factors that limit performance.* Strength & Conditioning Journal (NSCA). https://pubmed.ncbi.nlm.nih.gov/25506270/
- ACE Exercise Library: Bodyweight squat. https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/
- Straub RK, Powers CM (2024). Squat kinematics, trunk and shin angles. https://pmc.ncbi.nlm.nih.gov/articles/PMC10987311/
- Fry AC et al. (2003). Effect of knee position on hip and knee torques during the barbell squat. https://pubmed.ncbi.nlm.nih.gov/14636100/
- Split-squat step length (2023). Frontiers in Bioengineering and Biotechnology. https://www.frontiersin.org/articles/10.3389/fbioe.2023.1277493/full
- Bodyweight squat motion-capture study (2021). https://pmc.ncbi.nlm.nih.gov/articles/PMC8439674
- NASM overhead squat assessment (side-view checks: forward lean, heel lift).

Thresholds marked as tuned (0.35 stance, 20° lean, 2 cm heel) are engineering judgment based on
the sources. They'll be checked against real tester data in Step 17.
