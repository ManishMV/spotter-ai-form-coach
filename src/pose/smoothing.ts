// Removes jitter from body points with the "1€ filter" (1eurofilter package):
// smooths heavily when you're still, lightly when you move fast, so it doesn't feel laggy.
import { OneEuroFilter } from '1eurofilter'

type Point = { x: number; y: number; z: number; visibility?: number }

// Lower MIN_CUTOFF = steadier when still. Higher BETA = less lag during fast moves.
const MIN_CUTOFF = 1.0
const BETA = 1.0

export class PointSmoother {
  private filters: OneEuroFilter[][] = []

  smooth<T extends Point>(points: T[], timeMs: number): T[] {
    const t = timeMs / 1000
    return points.map((p, i) => {
      this.filters[i] ??= [0, 1, 2].map(() => new OneEuroFilter(30, MIN_CUTOFF, BETA))
      const [fx, fy, fz] = this.filters[i]
      return { ...p, x: fx.filter(p.x, t), y: fy.filter(p.y, t), z: fz.filter(p.z, t) }
    })
  }

  /** Call when the person leaves the frame, so the next detection doesn't "slide" in. */
  reset() {
    this.filters = []
  }
}
