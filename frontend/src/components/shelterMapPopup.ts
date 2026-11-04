import type { Map as MapLibreMap, Popup } from "maplibre-gl"
import type { Shelter } from "../types/shelter"
import { formatShelterCapacity } from "../utils/formatCapacity"
import { describeShelterLocation } from "../utils/shelterLabel"
import { describeShelterType } from "../utils/shelterType"
import { formatDistanceMeters } from "../utils/distance"

/**
 * Keeps an open popup inside the map without moving the camera, including after text or map
 * resizing. The scrollable content leaves room for the popup's own padding, tip and focus
 * outlines. An independent CSS translation preserves MapLibre's native anchor calculation.
 * Observers and the map listener are released when the popup closes or its map is removed.
 */
export function observePopupLayout(map: MapLibreMap, popup: Popup, content: HTMLElement): void {
  const mapElement = map.getContainer()
  const popupElement = popup.getElement()
  // A standard 16px inset also keeps the 3px outline and 4px offset inside rounded map edges.
  const inset = 16
  let offsetX = 0
  let offsetY = 0

  function update() {
    if (!popup.isOpen()) return
    const maxWidth = `min(24rem, ${Math.max(0, mapElement.clientWidth - inset * 2)}px)`
    if (popup.getMaxWidth() !== maxWidth) popup.setMaxWidth(maxWidth)

    const chromeHeight = popupElement.offsetHeight - content.offsetHeight
    content.style.maxHeight = `${Math.max(0, mapElement.clientHeight - inset * 2 - chromeHeight)}px`
    popup.setLngLat(popup.getLngLat())

    const mapBounds = mapElement.getBoundingClientRect()
    const popupBounds = popupElement.getBoundingClientRect()
    const left = popupBounds.left - offsetX
    const top = popupBounds.top - offsetY
    offsetX =
      Math.max(
        mapBounds.left + inset,
        Math.min(left, mapBounds.right - popupBounds.width - inset)
      ) - left
    offsetY =
      Math.max(
        mapBounds.top + inset,
        Math.min(top, mapBounds.bottom - popupBounds.height - inset)
      ) - top
    popupElement.style.translate = `${offsetX}px ${offsetY}px`
  }

  const observer = new ResizeObserver(() => {
    if (!popup.isOpen()) return
    map.resize()
    update()
  })
  observer.observe(mapElement)
  observer.observe(popupElement)
  // Entries keep their natural height even while the outer scroll region is capped.
  for (const entry of Array.from(content.children)) observer.observe(entry)
  map.on("move", update)
  popup.once("close", () => {
    observer.disconnect()
    map.off("move", update)
  })
  update()
}

/**
 * Builds one shelter's save/remove button as plain DOM, mirroring ShelterSaveToggle's labels
 * and styling (✓/○ status line, right-aligned blue save / red outlined remove button) so the
 * popup's control looks and reads the same as the list/detail page's. Unlike ShelterSaveToggle,
 * there is no React re-render to pick up the saved state afterward, so the click handler flips
 * its own local `saved` flag and updates the label and styling once save()/remove() resolves -
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
  status.className =
    "grid grid-cols-1 items-center text-sm font-semibold wrap-normal text-slate-700"
  // Hidden grid peers reserve the longer status and action labels in both states.
  const icon = document.createElement("span")
  icon.className = "mr-2 inline-block w-4 text-center"
  icon.setAttribute("aria-hidden", "true")
  const statusLabels = document.createElement("span")
  statusLabels.className = "col-start-1 row-start-1"
  const statusSizer = document.createElement("span")
  statusSizer.className = "invisible col-start-1 row-start-1 select-none"
  statusSizer.setAttribute("aria-hidden", "true")
  const sizingIcon = document.createElement("span")
  sizingIcon.className = "mr-2 inline-block w-4 text-center"
  sizingIcon.textContent = "✓"
  statusSizer.append(sizingIcon, document.createTextNode("Sparat skyddsrum"))
  const statusLabel = document.createElement("span")
  statusLabel.className = "col-start-1 row-start-1"
  statusLabels.append(icon, statusLabel)
  status.append(statusSizer, statusLabels)

  const button = document.createElement("button")
  button.type = "button"
  const buttonSizer = document.createElement("span")
  buttonSizer.className = "invisible col-start-1 row-start-1 select-none"
  buttonSizer.setAttribute("aria-hidden", "true")
  buttonSizer.textContent = "Ta bort sparat skyddsrum"
  const buttonLabel = document.createElement("span")
  buttonLabel.className = "col-start-1 row-start-1"
  button.append(buttonSizer, buttonLabel)

  let saved = initialSaved

  const render = () => {
    icon.textContent = saved ? "✓" : "○"
    statusLabel.textContent = saved ? "Sparat skyddsrum" : "Inte sparat"

    buttonLabel.textContent = saved ? "Ta bort sparat skyddsrum" : "Spara skyddsrum"
    button.className =
      "inline-grid min-h-12 w-fit min-w-12 shrink-0 self-end items-center justify-items-center rounded-xl wrap-normal " +
      "border-2 px-5 py-3 text-center font-semibold max-sm:px-2 " +
      (saved
        ? "border-red-800 bg-white text-red-800 hover:bg-red-50"
        : "border-blue-900 bg-blue-900 text-white hover:bg-blue-950")
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
 * simulating a click on it. The scroll region remains keyboard accessible when a long list or
 * enlarged text needs more room than the map. Keeping it here also keeps AllSheltersMap.tsx's exports limited to
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
  container.className = "flex flex-col gap-3 overflow-y-auto overscroll-contain p-2 wrap-anywhere"
  container.tabIndex = 0
  container.setAttribute("role", "region")
  container.setAttribute("aria-label", "Skyddsrum vid vald plats")
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
