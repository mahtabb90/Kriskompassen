import type { Shelter } from "../types/shelter"
import { formatShelterCapacity } from "../utils/formatCapacity"
import { describeShelterLocation } from "../utils/shelterLabel"
import { describeShelterType } from "../utils/shelterType"
import { formatDistanceMeters } from "../utils/distance"

/**
 * Builds one shelter's save/remove button as plain DOM, mirroring ShelterSaveToggle's labels
 * and styling (✓/○ status line, "Spara skyddsrum" / "Ta bort sparat skyddsrum" button) so the
 * popup's control looks and reads the same as the list/detail page's. Unlike ShelterSaveToggle,
 * there is no React re-render to pick up the saved state afterward, so the click handler flips
 * its own local `saved` flag and re-renders the label itself once save()/remove() resolves -
 * the marker icon's own update still comes separately, from savedShelterIds flowing back through
 * AllSheltersMap.tsx's own data-sync effect.
 */
function buildSaveToggleElement(
  shelter: Shelter,
  initialSaved: boolean,
  save: (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">) => Promise<void>,
  remove: (id: string) => Promise<void>
): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.className = "flex flex-col gap-2"

  const status = document.createElement("p")
  status.className = "flex items-center gap-2 text-sm font-semibold text-slate-700"

  const button = document.createElement("button")
  button.type = "button"

  let saved = initialSaved

  const render = () => {
    status.textContent = ""
    const icon = document.createElement("span")
    icon.setAttribute("aria-hidden", "true")
    icon.textContent = saved ? "✓" : "○"
    status.appendChild(icon)
    status.appendChild(document.createTextNode(saved ? "Sparat skyddsrum" : "Inte sparat"))

    button.textContent = saved ? "Ta bort sparat skyddsrum" : "Spara skyddsrum"
    button.className =
      "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 " +
      "border-blue-900 px-5 py-3 text-center font-semibold " +
      (saved
        ? "bg-white text-blue-900 hover:bg-blue-50"
        : "bg-blue-900 text-white hover:bg-blue-950")
  }
  render()

  button.addEventListener("click", () => {
    void (saved ? remove(shelter.id) : save(shelter)).then(() => {
      saved = !saved
      render()
    })
  })

  wrapper.appendChild(status)
  wrapper.appendChild(button)
  return wrapper
}

/**
 * Builds a click location's popup content as plain DOM - not a React render - since the popup
 * is attached to the map outside React's tree, where react-router's context (needed by a real
 * navigation link) is not available. Groups whatever map.queryRenderedFeatures(e.point, ...)
 * returned at the click point into one popup listing every shelter there, since shelters sharing
 * (practically) the same coordinate - a real MCF data pattern - render as overlapping,
 * individually unaddressable symbol-layer points rather than separate DOM markers.
 *
 * Lives in its own module (not AllSheltersMap.tsx) specifically so AllSheltersMap.test.tsx can
 * import and exercise it directly - MapLibre itself needs a real WebGL canvas and can't run
 * under jsdom, so there is no feasible way to test this via rendering the map component and
 * simulating a click on it. Keeping it here also keeps AllSheltersMap.tsx's exports limited to
 * its default component, which React Fast Refresh requires for HMR to work.
 */
export function buildPopupContent(
  shelters: Shelter[],
  municipality: string | null | undefined,
  distanceById: ReadonlyMap<string, number>,
  onNavigate: (path: string) => void,
  isSaved: (id: string) => boolean,
  save: (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">) => Promise<void>,
  remove: (id: string) => Promise<void>
): HTMLElement {
  const container = document.createElement("div")
  container.className = "flex flex-col gap-3"
  for (const shelter of shelters) {
    const entry = document.createElement("div")
    entry.className = "flex flex-col gap-1"

    const location = document.createElement("p")
    location.className = "font-semibold text-blue-900"
    location.textContent = describeShelterLocation(shelter, municipality)
    entry.appendChild(location)

    if (shelter.number) {
      const number = document.createElement("p")
      number.className = "text-sm"
      number.textContent = `Skyddsrumsnummer ${shelter.number}`
      entry.appendChild(number)
    }

    // One combined line, same ordering/separator as ShelterListItem's own "otherDetails" line,
    // for a consistent reading order between the map popup and the list view.
    const distanceMeters = distanceById.get(shelter.id)
    const detailParts = [
      distanceMeters !== undefined ? formatDistanceMeters(distanceMeters) : null,
      shelter.type ? describeShelterType(shelter.type) : null,
      shelter.capacity !== null ? formatShelterCapacity(shelter.capacity) : null,
    ].filter((value): value is string => Boolean(value))
    if (detailParts.length > 0) {
      const details = document.createElement("p")
      details.className = "text-sm"
      details.textContent = detailParts.join(" · ")
      entry.appendChild(details)
    }

    const detailsLink = document.createElement("a")
    detailsLink.href = `/skyddsrum/${shelter.id}`
    detailsLink.textContent = "Visa detaljer"
    detailsLink.className = "text-sm font-semibold text-blue-900 underline underline-offset-2"
    detailsLink.addEventListener("click", (event) => {
      event.preventDefault()
      onNavigate(`/skyddsrum/${shelter.id}`)
    })
    entry.appendChild(detailsLink)
    entry.appendChild(buildSaveToggleElement(shelter, isSaved(shelter.id), save, remove))

    container.appendChild(entry)
  }
  return container
}
