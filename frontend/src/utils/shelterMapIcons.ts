/**
 * Builds the map markers for ShelterLocationMap as plain DOM elements (inline SVG), passed to
 * maplibre-gl's Marker via its `element` option - not image files.
 *
 * Each exported function creates a *fresh* element on every call, since a DOM node can only be
 * attached to one marker at a time (unlike Leaflet's L.DivIcon, which is a reusable config
 * object Leaflet clones internally - maplibre-gl's Marker takes direct ownership of the element
 * you give it).
 *
 * Matches CrisisIcon's existing visual convention (stroke 1.8, currentColor-based palette)
 * rather than introducing a second icon style. The shelter icon reuses the shelter sign
 * described in ShelterGeneralInfo.tsx - "en orange ruta med en blå triangel" - the same
 * real-world sign a user would actually look for at a shelter's entrance, rather than an
 * arbitrary pin shape.
 */

/** Also reused by shelterMapImages.ts to build the clustered all-shelters map's addImage()
 * bitmap icons, for visual continuity with this DOM-based marker's sign. */
export const SHELTER_SIGN = `
  <rect x="4" y="4" width="16" height="16" rx="2" fill="#F59E0B" stroke="#1E3A8A" stroke-width="1.5" />
  <path d="M12 7 L17 16 H7 Z" fill="#1E3A8A" />
`

/** Rendered marker sizes in CSS pixels - matches each &lt;svg&gt; element's width/height below, and
 * is reused by ShelterLocationMap's captureImage() to scale the rasterized marker it draws onto
 * the saved snapshot to the same on-screen size. */
export const SHELTER_MARKER_SIZE = 32
export const ORIGIN_MARKER_SIZE = 24

/** Raw markup for the two marker elements below - also handed to mapSnapshot.ts's loadSvgImage()
 * so captureImage() can rasterize the same marker onto the saved snapshot. See that function's
 * doc comment for why the live DOM markers can't just be captured directly. */
export const SHELTER_MARKER_SVG = `
    <svg aria-hidden="true" focusable="false" width="${SHELTER_MARKER_SIZE}" height="${SHELTER_MARKER_SIZE}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      ${SHELTER_SIGN}
    </svg>
  `.trim()

export const ORIGIN_MARKER_SVG = `
    <svg aria-hidden="true" focusable="false" width="${ORIGIN_MARKER_SIZE}" height="${ORIGIN_MARKER_SIZE}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#1E3A8A" fill-opacity="0.25" />
      <circle cx="12" cy="12" r="6" fill="#1E3A8A" stroke="white" stroke-width="2" />
    </svg>
  `.trim()

function elementFromSvg(svg: string): HTMLDivElement {
  const wrapper = document.createElement("div")
  wrapper.innerHTML = svg
  return wrapper
}

/** Builds the plain shelter marker element shown on ShelterLocationMap - always alone, so no
 * selection ring or nearest badge variant is needed here. */
export function shelterMarkerElement(): HTMLDivElement {
  return elementFromSvg(SHELTER_MARKER_SVG)
}

/**
 * Builds the user's own position marker - a filled dot, deliberately a different shape from
 * the shelter sign so the two are never confused at a glance.
 */
export function originMarkerElement(): HTMLDivElement {
  return elementFromSvg(ORIGIN_MARKER_SVG)
}
