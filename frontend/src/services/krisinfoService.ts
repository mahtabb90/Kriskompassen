import {
  krisinfoSections,
  type KrisinfoSectionId,
  type KrisinfoSections,
} from "../content/krisinfo/index"

type KrisinfoErrorCode = "aborted" | "unknown_section"

/** Signals that a krisinfo section could not be read, so callers can show a failure state. */
export class KrisinfoError extends Error {
  readonly code: KrisinfoErrorCode

  constructor(code: KrisinfoErrorCode, message: string) {
    super(message)
    this.name = "KrisinfoError"
    this.code = code
  }
}

/**
 * Reads one krisinfo section.
 *
 * The content is bundled with the app, so this performs no network or storage I/O and works
 * offline. It is asynchronous and accepts an abort signal so the data source can later move to
 * IndexedDB or a backend without changing callers. The returned object is shared; do not mutate.
 *
 * @param sectionId The section to read.
 * @param signal Cancels the read; an already aborted signal rejects without reading.
 * @returns The section's content, typed by its ID.
 * @throws {KrisinfoError} `aborted` if the signal is aborted, or `unknown_section` if the ID
 * does not exist at runtime (for example an unchecked cast from a URL).
 */
export async function getKrisinfoSection<K extends KrisinfoSectionId>(
  sectionId: K,
  signal?: AbortSignal
): Promise<KrisinfoSections[K]> {
  if (signal?.aborted) throw new KrisinfoError("aborted", "The krisinfo read was cancelled.")
  if (!Object.prototype.hasOwnProperty.call(krisinfoSections, sectionId)) {
    throw new KrisinfoError("unknown_section", `Unknown krisinfo section: ${sectionId}`)
  }
  return krisinfoSections[sectionId]
}
