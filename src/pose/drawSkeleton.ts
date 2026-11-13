// Draws the body points and the lines between them, skipping points the tracker isn't sure about.
// Workout view: the same look as the logo and the setup demo (white limbs, orange joints, a circle
// for the head), with a soft dark edge so it reads on any background. Debug view: every raw point.
import { PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

// Below this, a point is probably hidden or guessed, so we don't draw it.
export const MIN_VISIBILITY = 0.5

const isVisible = (p: NormalizedLandmark | undefined) => !!p && (p.visibility ?? 1) >= MIN_VISIBILITY

// Arm + leg points (MediaPipe numbering) for each side of the body. Shoulders and hips stay drawn.
const LIMBS = {
  left: new Set([13, 15, 17, 19, 21, 25, 27, 29, 31]),
  right: new Set([14, 16, 18, 20, 22, 26, 28, 30, 32]),
}

// Workout view leaves out the face points (0–10) and finger points (17–22): they jitter and add clutter.
const CLEAN = (i: number) => i >= 11 && !(i >= 17 && i <= 22)
// Joints that get an orange dot: shoulders, elbows, wrists, hips, knees, ankles.
const JOINTS = new Set([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28])
const ACCENT = '#ff5a1f'

/**
 * @param hideSide In side view the far arm and leg are hidden behind the body, so the tracker only
 *   guesses where they are. Pass that side to skip drawing them.
 * @param debug Draw every point (the raw tracking view) instead of the clean workout look.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  poses: NormalizedLandmark[][],
  hideSide: 'left' | 'right' | null = null,
  debug = false,
) {
  const hidden = hideSide ? LIMBS[hideSide] : null
  const show = (points: NormalizedLandmark[], i: number) => !hidden?.has(i) && (debug || CLEAN(i)) && isVisible(points[i])
  const { width: w, height: h } = ctx.canvas
  ctx.clearRect(0, 0, w, h)
  const s = Math.max(w, h) / 720 // same look at any camera resolution
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const points of poses) {
    const segments = () => {
      ctx.beginPath()
      for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
        if (!show(points, start) || !show(points, end)) continue
        ctx.moveTo(points[start].x * w, points[start].y * h)
        ctx.lineTo(points[end].x * w, points[end].y * h)
      }
    }
    // Head: a circle around the face points (centre between the ears/nose, size from ear spacing).
    const face = [0, 7, 8].map((i) => points[i]).filter(isVisible)
    const head =
      !debug && face.length >= 2
        ? {
            x: (face.reduce((n, p) => n + p.x, 0) / face.length) * w,
            y: (face.reduce((n, p) => n + p.y, 0) / face.length) * h,
            // Widest gap between nose and ears ≈ half a head, in side view or facing.
            r: Math.max(10 * s, ...face.flatMap((a) => face.map((b) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h) * 0.9))),
          }
        : null

    // Dark edge first (cheaper than a canvas shadow on phones), then the white line on top.
    for (const [color, width] of [
      ['rgba(0,0,0,0.35)', 9 * s],
      ['rgba(255,255,255,0.95)', 5 * s],
    ] as const) {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      segments()
      if (head) {
        ctx.moveTo(head.x + head.r, head.y)
        ctx.arc(head.x, head.y, head.r, 0, Math.PI * 2)
      }
      ctx.stroke()
    }

    // Dots: orange key joints with a dark ring (debug: every point, small and green).
    for (const [i, p] of points.entries()) {
      if (!show(points, i) || (!debug && !JOINTS.has(i))) continue
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, (debug ? 5 : 7) * s, 0, Math.PI * 2)
      ctx.fillStyle = debug ? '#34d399' : ACCENT
      ctx.fill()
      ctx.strokeStyle = debug ? '#fff' : 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 2 * s
      ctx.stroke()
    }
  }
}
