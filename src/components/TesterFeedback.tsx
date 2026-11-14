// Tester links only: a "Feedback" button in the top bar, so the form is always one tap away, even for
// someone who ends early or skips the summary. If they've done a set, their results are copied first.
import { isTester, openFeedbackForm } from '../tester'

export function TesterFeedbackButton() {
  if (!isTester) return null
  return (
    <button
      onClick={() => void openFeedbackForm('top bar')}
      className="label press h-9 border border-accent/60 px-3 text-accent hover:bg-accent hover:text-accent-ink"
    >
      Feedback
    </button>
  )
}
