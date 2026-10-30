/**
 * Builds the map markers for ShelterMap as plain DOM elements (inline SVG), passed to
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

const SHELTER_SIGN = `
  <rect x="4" y="4" width="16" height="16" rx="2" fill="#F59E0B" stroke="#1E3A8A" stroke-width="1.5" />
  <path d="M12 7 L17 16 H7 Z" fill="#1E3A8A" />
`

function shelterMarkerSvg(options: { ringColor?: string; badge?: string }): string {
  const { ringColor, badge } = options
  const ring = ringColor
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="${ringColor}" stroke-width="2.5" />`
    : ""
  const badgeMark = badge
    ? `<circle cx="19" cy="5" r="5" fill="#1E3A8A" stroke="white" stroke-width="1" />
       <text x="19" y="7.3" font-size="7" font-weight="bold" fill="white" text-anchor="middle">${badge}</text>`
    : ""
  return `
    <svg aria-hidden="true" focusable="false" width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      ${ring}
      ${SHELTER_SIGN}
      ${badgeMark}
    </svg>
  `
}

function elementFromSvg(svg: string): HTMLDivElement {
  const wrapper = document.createElement("div")
  wrapper.innerHTML = svg.trim()
  return wrapper
}

/**
 * Builds a shelter marker's element for the given selection/nearest state.
 *
 * The nearest shelter always gets a small "1" badge, never color alone (WCAG), since this must
 * stay visually distinct even for a user who cannot perceive the ring/badge color. Selection
 * (synced with the list, see ShelterPage.tsx) adds a ring, independent of the nearest badge -
 * both can apply to the same marker at once.
 */
export function shelterMarkerElement(options: {
  isNearest: boolean
  isSelected: boolean
}): HTMLDivElement {
  return elementFromSvg(
    shelterMarkerSvg({
      ringColor: options.isSelected ? "#1E3A8A" : undefined,
      badge: options.isNearest ? "1" : undefined,
    })
  )
}

/**
 * Builds the user's own position marker - a filled dot, deliberately a different shape from
 * the shelter sign so the two are never confused at a glance.
 */
export function originMarkerElement(): HTMLDivElement {
  return elementFromSvg(`
    <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#1E3A8A" fill-opacity="0.25" />
      <circle cx="12" cy="12" r="6" fill="#1E3A8A" stroke="white" stroke-width="2" />
    </svg>
  `)
}
