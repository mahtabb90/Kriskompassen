/**
 * Shared content model for static crisis information (krisinfo) such as phone numbers and
 * warning signals.
 *
 * Every field holds plain text or a URL. Consumers render text as text and never as HTML or
 * Markdown, so content can later come from IndexedDB or a backend without changing its safety
 * rules.
 */

/**
 * Names the authority or organisation a content post is based on.
 *
 * @property name Display name of the source, e.g. "Krisinformation.se".
 * @property url Absolute `https` URL of the source page the post was checked against.
 */
export interface ContentSource {
  name: string
  url: string
}

/**
 * Attribution and verification metadata required on every content post.
 *
 * @property source The page the post is based on. Texts are written in own wording based on the
 * source; facts and meaning must match it. It means "based on", not "quoted from".
 * @property lastVerified Date (`YYYY-MM-DD`) a person last compared the post's facts and meaning
 * with `source`.
 * It changes only when someone checks the post again, never when the content is read or shipped.
 */
export interface VerifiedContent {
  source: ContentSource
  lastVerified: string
}

/**
 * A titled block of crisis information.
 *
 * @property id Stable, URL-safe identifier, unique within its collection.
 * @property summary One or two sentences introducing the section.
 * @property points Ordered plain-text paragraphs or advice; empty when the section has none.
 */
export interface InfoSection extends VerifiedContent {
  id: string
  title: string
  summary: string
  points: readonly string[]
}

/**
 * An information section that also lists items of one kind, such as phone numbers or signals.
 *
 * The section and each item carry their own source and verification date, because items may be
 * checked against different pages at different times.
 */
export interface ListSection<T> extends InfoSection {
  items: readonly T[]
}

/**
 * A Swedish phone number for help or information during a crisis.
 *
 * @property number The number as it is displayed, with the source's spacing (e.g. "113 13").
 * Views building a `tel:` link keep only its digits, so spaces and hyphens never reach the link.
 * @property label Short name of the service, in own wording.
 * @property description What the service is, in own wording based on the source.
 * @property whenToUse When to call, in own wording based on the source.
 * @property isEmergency True only for emergency numbers that should be called in acute danger.
 * @property abroadNumber The number the source gives for calls from abroad or from a phone
 * registered outside Sweden, in international format with the source's spacing
 * (e.g. "+46 77 33 113 13"). Views building a `tel:` link keep the leading `+` and the digits.
 * Absent when the source gives no such number.
 */
export interface Phone extends VerifiedContent {
  number: string
  label: string
  description: string
  whenToUse: string
  isEmergency: boolean
  abroadNumber?: string
}

/**
 * The timing of an outdoor warning signal, structured so a view can draw it.
 *
 * All values are in seconds. A pause separates two tones, so no pause follows the last tone.
 * Exactly one of `repeatCount` and `totalDurationSeconds` describes when the signal ends:
 * - `repeatCount` is the number of tones, used when the source states how many times it sounds.
 * - `totalDurationSeconds` is the source's stated duration, used when it states a time instead.
 *   The number of whole tones that fit is left to the consumer.
 *
 * A single continuous tone is `{ toneSeconds, pauseSeconds: 0, repeatCount: 1 }`.
 *
 * @property toneSeconds Length of each tone; greater than zero.
 * @property pauseSeconds Silence between two tones; zero or greater.
 */
export type SignalPattern = {
  toneSeconds: number
  pauseSeconds: number
} & (
  | { repeatCount: number; totalDurationSeconds?: never }
  | { totalDurationSeconds: number; repeatCount?: never }
)

/**
 * An external page that complements an action step.
 *
 * Following it needs an internet connection, so the step's text never depends on it.
 *
 * @property label Visible Swedish link text. Views add their own "(öppnas i ny flik)" suffix.
 * @property url Absolute `https` URL of an official page.
 */
export interface ActionLink {
  label: string
  url: string
}

/**
 * One action based on a source, optionally with a supporting link.
 *
 * @property text Own wording based on the source; facts and meaning must match, and no advice
 * beyond the source is added. It must be complete and readable without `link`, because links
 * need internet while, for example, radio via FM works without it.
 * @property link Optional complement, such as the radio channel's or a website's page. It never
 * changes or replaces `text`.
 */
export interface ActionStep {
  text: string
  link?: ActionLink
}

/**
 * An outdoor warning signal ("Hesa Fredrik") and how to respond to it.
 *
 * @property id Stable, URL-safe identifier.
 * @property name The signal's Swedish name, e.g. "Flyglarm".
 * @property patternDescription The pattern in words, so it never relies on a drawing alone.
 * @property meaning What the signal means, in own wording based on an official source; facts and
 * meaning must match it. Absent when no official source states one; never an own explanation.
 * @property meaningSource The page `meaning` is based on when that is not `source`; absent
 * otherwise and whenever `meaning` is absent.
 * @property whatToDo Ordered actions based on `source`; empty if it states none.
 * @property pattern Structured timing matching `patternDescription`.
 * @property audioLinkUrl External link to the source's recording of the signal, opened in a new
 * tab by the browser. It is not an audio file the app plays, stores or caches. Absent until a
 * recording link is confirmed.
 */
export interface Signal extends VerifiedContent {
  id: string
  name: string
  patternDescription: string
  meaning?: string
  meaningSource?: ContentSource
  whatToDo: readonly ActionStep[]
  pattern: SignalPattern
  audioLinkUrl?: string
}
