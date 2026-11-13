// The voice layer's contract. Any voice (browser speech today, pre-recorded clips later) implements this.

export type SayOptions = {
  /**
   * true  = stop whatever is being said and say this now (rep events, countdown, no-reps).
   * false = say it when the current line finishes; if something else is already waiting,
   *         this replaces it (only the newest waiting line is kept — nothing goes stale).
   */
  interrupt: boolean
}

export interface Voice {
  /** Call inside a tap handler: phones only allow sound after a user gesture. */
  unlock(): void
  say(text: string, options: SayOptions): void
  /** Stop speaking and drop anything waiting (e.g. leaving the workout). */
  stop(): void
}
