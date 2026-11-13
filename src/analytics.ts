// Product analytics (PostHog), kept small and private:
//   • Only the funnel steps below are sent: no automatic click tracking, no session recording,
//     no cookies (nothing stored on the device), and never any video or names.
//   • Loaded after the page, so the landing page stays fast.
//   • Off on localhost, in the Test lab / debug views, and when the
//     browser asks not to be tracked. Add ?analytics to a localhost address to test it.
// Where a visit came from: ?ref=reddit-formcheck etc. on shared links, sent with every event.

/** The funnel, in order. */
export type AnalyticsEvent =
  | 'exercise_picked' // home → setup
  | 'set_start_tapped' // tapped Start
  | 'camera_started' // camera on and tracking
  | 'camera_failed' // couldn't start the camera
  | 'counting_started' // countdown reached "Go"
  | 'set_finished' // summary shown
  | 'feedback_form_opened' // tester / feedback form

type Props = Record<string, string | number | boolean | null>

// PostHog project keys are public by design (they can only send events, not read data), so it lives here.
const KEY = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ?? 'phc_tuV3xbJJKH4JNHyDbagXWYSj5LumqnZsVmtUUw2H4ZNi'
// Sent through Spotter's own address (/ingest, forwarded to PostHog by vercel.json), so privacy browsers
// like Brave and ad blockers don't silently drop the funnel. Still only the events listed above.
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? '/ingest'

const params = new URLSearchParams(location.search)
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
const enabled =
  !!KEY &&
  (!isLocal || params.has('analytics')) &&
  !params.has('lab') &&
  !params.has('debug') &&
  navigator.doNotTrack !== '1'

type Client = { capture: (event: string, props?: Props) => void }
let client: Client | null = null
const queue: [AnalyticsEvent, Props | undefined][] = []

if (enabled) {
  // Load once the page is idle; events sent before then wait in the queue.
  const load = () =>
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(KEY!, {
        api_host: HOST,
        ui_host: 'https://us.posthog.com',
        persistence: 'memory', // no cookies or local storage: each visit is anonymous
        person_profiles: 'identified_only', // never builds a profile of anyone
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_surveys: true,
      })
      // Sent with every event: where the visit came from (PostHog adds the device type itself).
      posthog.register({
        ref: params.get('ref') ?? (params.has('tester') ? 'tester' : 'direct'),
        tester: params.has('tester'),
      })
      client = posthog
      queue.splice(0).forEach(([event, props]) => posthog.capture(event, props))
    })
  if ('requestIdleCallback' in window) requestIdleCallback(() => void load(), { timeout: 3000 })
  else setTimeout(() => void load(), 1500)
}

/** Record one funnel step. Safe to call anywhere: does nothing when analytics is off. */
export function track(event: AnalyticsEvent, props?: Props) {
  if (!enabled) return
  if (client) client.capture(event, props)
  else queue.push([event, props])
}
