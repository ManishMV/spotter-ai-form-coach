// The voice layer's contract. Any voice (browser speech today, pre-recorded clips later) implements this.

export type SayOptions = {
  /**
   * true  = stop whatever is being said and say this now (rep events, countdown, no-reps).
   * false = say it when the current line finishes; if something else is already waiting,
   *         this replaces it (only the newest waiting line is kept — nothing goes stale).
   */
  interrupt: boolean
  /**
   * If this has to wait, drop it unless it can start within this many ms. A cue about rep 4 is
   * useless once rep 6 has started, so stale lines are thrown away instead of said late.
   */
  expiresInMs?: number
}

export interface Voice {
  /** Call inside a tap handler: phones only allow sound after a user gesture. */
  unlock(): void
  say(text: string, options: SayOptions): void
  /** Is something being said right now? */
  isSpeaking(): boolean
  /** Stop speaking and drop anything waiting (e.g. leaving the workout). */
  stop(): void
}
