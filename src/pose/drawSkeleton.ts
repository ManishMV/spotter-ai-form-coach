// Draws the body points and the lines between them, skipping points the tracker isn't sure about.
import { PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

// Below this, a point is probably hidden or guessed, so we don't draw it.
export const MIN_VISIBILITY = 0.5

const isVisible = (p: NormalizedLandmark | undefined) => !!p && (p.visibility ?? 1) >= MIN_VISIBILITY

// Arm + leg points (MediaPipe numbering) for each side of the body. Shoulders and hips stay drawn.
const LIMBS = {
  left: new Set([13, 15, 17, 19, 21, 25, 27, 29, 31]),
  right: new Set([14, 16, 18, 20, 22, 26, 28, 30, 32]),
}

/**
 * @param hideSide In side view the far arm and leg are hidden behind the body, so the tracker only
 *   guesses where they are. Pass that side to skip drawing them.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  poses: NormalizedLandmark[][],
  hideSide: 'left' | 'right' | null = null,
) {
  const hidden = hideSide ? LIMBS[hideSide] : null
  const show = (points: NormalizedLandmark[], i: number) => !hidden?.has(i) && isVisible(points[i])
  const { width: w, height: h } = ctx.canvas
  ctx.clearRect(0, 0, w, h)

  for (const points of poses) {
    // Lines: only when both ends are visible.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
      if (!show(points, start) || !show(points, end)) continue
      const a = points[start]
      const b = points[end]
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(b.x * w, b.y * h)
    }
    ctx.stroke()

    // Dots.
    ctx.fillStyle = '#34d399'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    for (const [i, p] of points.entries()) {
      if (!show(points, i)) continue
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}
