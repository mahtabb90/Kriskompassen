import { useCallback } from "react"
import type { KrisinfoSectionId, KrisinfoSections } from "../content/krisinfo/index"
import { getKrisinfoSection } from "../services/krisinfoService"
import { useCrisisResource, type CrisisResourceState } from "./useCrisisResource"

/** Loading, error or ready state for one krisinfo section, typed by its ID. */
export type KrisinfoState<K extends KrisinfoSectionId> = CrisisResourceState<KrisinfoSections[K]>

/**
 * Loads one krisinfo section for a page.
 *
 * Reads through `getKrisinfoSection`, so pages keep working if the source later moves to
 * IndexedDB or a backend. The content is available in both online and offline mode, so this hook
 * does not read the "Sparad information" mode. Changing `sectionId` starts a fresh load and never
 * shows the previous section's data; the obsolete read is aborted and late results are ignored.
 *
 * @param sectionId The section to load.
 * @returns `state` (`loading`, `error` with the thrown error, or `ready` with the section) and
 * `retry`, which starts a new attempt after an error.
 */
export function useKrisinfo<K extends KrisinfoSectionId>(sectionId: K) {
  const load = useCallback(
    (signal: AbortSignal) => getKrisinfoSection(sectionId, signal),
    [sectionId]
  )
  const { state, retry } = useCrisisResource<KrisinfoSections[K]>(sectionId, load)
  return { state, retry }
}
