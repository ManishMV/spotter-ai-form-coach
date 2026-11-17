// One camera frame's pose → what Spotter knows about the person: which side faces the camera, the angles,
// whether every needed part is in the picture, and how well they fit it. Shared by the live camera
// (usePoseTracking) and the accuracy evals (src/eval), so both run exactly the same tracking logic.
import type { NormalizedLandmark, Landmark } from '@mediapipe/tasks-vision'
import { PointSmoother } from './smoothing'
import type { BodyPart } from '../exercises/types'
import { bodyFill, edgeRoom, isFacingCamera, measureAngles, NO_ANGLES, partsOutOfView, pickSide, shoulderSpread, stanceDiagnostics, type Angles, type Side, type StanceDiag } from '../coach/angles'

export type Readout = {
  side: Side | null
  facing: boolean
  inView: boolean
  /** Whether side-on vs facing has actually been checked yet (only possible standing in the start position). */
  facingKnown: boolean
  /** While out of view: which needed body parts are missing (so the prompt can say "feet", "knees"…). */
  missing: BodyPart[]
  angles: Angles
  diag: StanceDiag | null
  /** Debug view: room left between the needed body parts and the picture's edge (0–0.5), or null. */
  room: number | null
  /** Debug view: the tightest `room` over the last 5 s (covers a whole rep); null if a part left the picture. */
  roomTightest: number | null
  /** Distance guide: over the last second, the typical room to the picture's edge and how much of the
   *  picture the body fills (see `bodyFill`). null until the needed parts have been seen. */
  fit: { room: number; fill: number } | null
}

export const EMPTY_READOUT: Readout = { side: null, facing: false, inView: true, facingKnown: false, missing: [], angles: NO_ANGLES, diag: null, room: null, roomTightest: null, fit: null }

type Options = {
  /** Is the person in the exercise's start position? Side and facing are only (re)decided there. */
  isAtTop: (angles: Angles) => boolean
  /** Body parts that must be in the picture. */
  mustSee: () => BodyPart[]
  /** Debug view: compute extra diagnostics. */
  debug?: boolean
}

export class FrameAnalyzer {
  private screenSmoother = new PointSmoother()
  private worldSmoother = new PointSmoother()
  private side: Side | null = null
  private facing = false
  // In view / out of view, debounced so a single flickering frame doesn't toggle the prompt.
  private inView = true
  private facingKnown = false // reset when nobody is in view
  private missing: BodyPart[] = []
  private viewStreak = 0
  private roomLog: { at: number; room: number | null }[] = [] // debug view: last 5 s of `room`
  private fitLog: { at: number; room: number; fill: number }[] = [] // distance guide: last 1 s
  private readonly opts: Options

  constructor(opts: Options) {
    this.opts = opts
  }

  /** One frame. Returns null when nobody is in the picture (and starts fresh next time). */
  analyze(raw: NormalizedLandmark[] | undefined, rawWorld: Landmark[] | undefined, now: number, aspect: number) {
    if (!raw || !rawWorld) {
      this.screenSmoother.reset()
      this.worldSmoother.reset()
      this.fitLog = []
      this.side = null
      this.facing = false
      this.facingKnown = false
      this.inView = true
      this.viewStreak = 0
      return null
    }
    const screen = this.screenSmoother.smooth(raw, now)
    const world = this.worldSmoother.smooth(rawWorld, now)
    const { isAtTop, debug } = this.opts
    const parts = this.opts.mustSee()
    // Which leg to track is decided only in the start position, then locked for the rep: at the
    // bottom of a squat both knees push forward and the near/far reading gets close, and a mid-rep
    // hop to the far (guessed, straighter) leg read deep squats as shallow (tester, Nov 14).
    if (this.side === null) this.side = pickSide(screen, null, world)
    let side = this.side
    let angles = measureAngles(screen, world, side)
    let atTop = isAtTop(angles)
    if (atTop) {
      const best = pickSide(screen, side, world)
      if (best !== side) {
        side = this.side = best
        angles = measureAngles(screen, world, side)
        atTop = isAtTop(angles)
      }
    }
    // Decide facing vs side-on only in the start position too (see `isAtTop`).
    if (atTop) {
      this.facing = isFacingCamera(shoulderSpread(screen, aspect), this.facing)
      this.facingKnown = true
    }
    const outOfView = partsOutOfView(screen, side, parts)
    const nowInView = outOfView.length === 0
    if (!nowInView) this.missing = outOfView
    this.viewStreak = nowInView === this.inView ? 0 : this.viewStreak + 1
    if (this.viewStreak >= (this.inView ? 8 : 4)) {
      this.inView = nowInView // ~0.25 s out to pause, ~0.1 s back in to resume
      this.viewStreak = 0
    }
    const readout: Readout = {
      side,
      facing: this.facing,
      facingKnown: this.facingKnown,
      inView: this.inView,
      missing: this.inView ? [] : this.missing,
      angles,
      diag: debug ? stanceDiagnostics(screen, world, side, aspect) : null,
      room: null,
      roomTightest: null,
      fit: null,
    }
    const room = edgeRoom(screen, side, parts)
    const fill = bodyFill(screen, side, parts)
    this.fitLog = this.fitLog.filter((x) => now - x.at < 1000)
    if (room !== null && fill !== null) this.fitLog.push({ at: now, room, fill })
    const mid = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    readout.fit = this.fitLog.length >= 3 ? { room: mid(this.fitLog.map((x) => x.room)), fill: mid(this.fitLog.map((x) => x.fill)) } : null
    if (debug) {
      this.roomLog = [...this.roomLog.filter((x) => now - x.at < 5000), { at: now, room }]
      const out = this.roomLog.some((x) => x.room === null)
      readout.room = room
      readout.roomTightest = out ? null : Math.min(...this.roomLog.map((x) => x.room!))
    }
    return { readout, screen }
  }
}
