import type { Map as MapLibreMap } from "maplibre-gl"
import { SHELTER_SIGN } from "./shelterMapIcons"

/**
 * Builds the four bitmap icon variants the clustered all-shelters map's unclustered symbol
 * layer needs via map.addImage(). Separate from shelterMapIcons.ts, whose DOM-element builders
 * (shelterMarkerElement/originMarkerElement) remain untouched and are still used by ShelterMap.tsx
 * and ShelterLocationMap.tsx - a static addImage() bitmap, registered once, is a different
 * mechanism from a fresh DOM node created per marker, so this is new code, not a replacement.
 *
 * Reuses SHELTER_SIGN (the real shelter-entrance sign motif) for visual continuity, and marks
 * the "nearest" and "saved" variants with a letter badge rather than color alone (WCAG), same
 * principle as shelterMapIcons.ts's numbered nearest badge.
 */
export type ShelterIconVariant = "default" | "nearest" | "saved" | "nearest-saved"

export const SHELTER_ICON_IDS: Record<ShelterIconVariant, string> = {
  default: "shelter-icon-default",
  nearest: "shelter-icon-nearest",
  saved: "shelter-icon-saved",
  "nearest-saved": "shelter-icon-nearest-saved",
}

/** Picks the one icon id matching a shelter's (isNearest, isSaved) combination. */
export function shelterIconIdFor(isNearest: boolean, isSaved: boolean): string {
  if (isNearest && isSaved) return SHELTER_ICON_IDS["nearest-saved"]
  if (isNearest) return SHELTER_ICON_IDS.nearest
  if (isSaved) return SHELTER_ICON_IDS.saved
  return SHELTER_ICON_IDS.default
}

const ICON_SIZE = 48

function badgeMarkup(letter: string, cx: number): string {
  return (
    `<circle cx="${cx}" cy="5" r="5" fill="#1E3A8A" stroke="white" stroke-width="1" />` +
    `<text x="${cx}" y="7.3" font-size="7" font-weight="bold" fill="white" text-anchor="middle">${letter}</text>`
  )
}

/** Builds the raw SVG markup for one icon variant - pure and side-effect free, so it's testable
 * without a canvas or DOM. */
export function svgForVariant(variant: ShelterIconVariant): string {
  const badges =
    (variant === "nearest" || variant === "nearest-saved" ? badgeMarkup("N", 19) : "") +
    (variant === "saved" || variant === "nearest-saved"
      ? badgeMarkup("S", variant === "nearest-saved" ? 6 : 19)
      : "")
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24">` +
    `${SHELTER_SIGN}${badges}</svg>`
  )
}

/** Rasterizes one icon's SVG markup to ImageData via an offscreen canvas - isolated so tests can
 * mock just this step without needing real canvas/Image support in jsdom. */
export async function rasterizeShelterIcon(svg: string): Promise<ImageData> {
  const image = new Image(ICON_SIZE, ICON_SIZE)
  image.src = `data:image/svg+xml;base64,${btoa(svg)}`
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("2D canvas context is unavailable.")
  }
  context.drawImage(image, 0, 0, ICON_SIZE, ICON_SIZE)
  return context.getImageData(0, 0, ICON_SIZE, ICON_SIZE)
}

/**
 * Registers all four icon variants on the given map via addImage(), skipping any already
 * present. Call once per map instance, on its "load" event, before adding any layer that
 * references these ids.
 */
export async function registerShelterIcons(map: MapLibreMap): Promise<void> {
  for (const [variant, id] of Object.entries(SHELTER_ICON_IDS) as [ShelterIconVariant, string][]) {
    if (map.hasImage(id)) continue
    const image = await rasterizeShelterIcon(svgForVariant(variant))
    map.addImage(id, image)
  }
}
