import type { ListSection, Phone, Signal } from "../../types/krisinfo"
import { phoneNumbersSection } from "./phones"
import { warningSignalsSection } from "./signals"

/**
 * Maps each krisinfo section ID to the shape of its content.
 *
 * Add a section by adding its ID here and its data to `krisinfoSections`. Every section's `id`
 * equals its key.
 */
export interface KrisinfoSections {
  "phone-numbers": ListSection<Phone>
  "warning-signals": ListSection<Signal>
}

export type KrisinfoSectionId = keyof KrisinfoSections

/**
 * The static krisinfo content bundled with the app.
 *
 * It ships in the JavaScript bundle, so the service worker precaches it and a new edition reaches
 * an installed app only through the app update prompt. Read it through `getKrisinfoSection` in
 * `services/krisinfoService.ts` rather than importing it directly, so the data source can change
 * later without changing consumers.
 */
export const krisinfoSections: KrisinfoSections = {
  "phone-numbers": phoneNumbersSection,
  "warning-signals": warningSignalsSection,
}
