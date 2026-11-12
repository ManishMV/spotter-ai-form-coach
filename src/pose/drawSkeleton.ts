// Draws the body points and the lines between them, skipping points the tracker isn't sure about.
import { PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

// Below this, a point is probably hidden or guessed, so we don't draw it.
export const MIN_VISIBILITY = 0.5

const isVisible = (p: NormalizedLandmark | undefined) => !!p && (p.visibility ?? 1) >= MIN_VISIBILITY

export function drawSkeleton(ctx: CanvasRenderingContext2D, poses: NormalizedLandmark[][]) {
  const { width: w, height: h } = ctx.canvas
  ctx.clearRect(0, 0, w, h)

  for (const points of poses) {
    // Lines: only when both ends are visible.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
      const a = points[start]
      const b = points[end]
      if (!isVisible(a) || !isVisible(b)) continue
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(b.x * w, b.y * h)
    }
    ctx.stroke()

    // Dots.
    ctx.fillStyle = '#34d399'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    for (const p of points) {
      if (!isVisible(p)) continue
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}
