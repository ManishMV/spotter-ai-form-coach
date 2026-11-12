// Draws the detected body points and the lines between them onto a canvas.
import { DrawingUtils, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

export function drawSkeleton(ctx: CanvasRenderingContext2D, poses: NormalizedLandmark[][]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const draw = new DrawingUtils(ctx)
  for (const landmarks of poses) {
    draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: 'rgba(255,255,255,0.85)',
      lineWidth: 4,
    })
    draw.drawLandmarks(landmarks, { color: '#fff', fillColor: '#34d399', radius: 5, lineWidth: 2 })
  }
}
