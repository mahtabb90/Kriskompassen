/** The fixed snapshot size saved map images are downscaled to, to bound per-shelter storage. */
export const MAP_SNAPSHOT_WIDTH = 480
export const MAP_SNAPSHOT_HEIGHT = 320

/** A source rectangle to copy, in the source canvas's own pixel coordinates. */
interface SourceRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Picks the largest centered rectangle of sourceWidth×sourceHeight whose aspect ratio matches
 * destWidth×destHeight - the same "crop, then scale uniformly" math as CSS's object-fit: cover.
 *
 * ShelterLocationMap's live map is wide and short (full card width, h-64), nothing like the
 * fixed 480×320 snapshot size - drawing the whole source straight into 480×320 would stretch
 * each axis by a different factor and visibly distort every building and street. Cropping first
 * keeps the aspect ratio intact; only the parts outside the destination's framing are lost, the
 * same tradeoff "spara en vald vy" implies - the saved image favors looking like the live map
 * over including literally every pixel of it.
 */
export function coverSourceRect(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number
): SourceRect {
  const sourceAspect = sourceWidth / sourceHeight
  const destAspect = destWidth / destHeight

  if (sourceAspect > destAspect) {
    // Source is relatively wider than the destination - crop its sides, keep full height.
    const sw = sourceHeight * destAspect
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight }
  }
  // Source is relatively taller (or exactly matches) - crop its top/bottom, keep full width.
  const sh = sourceWidth / destAspect
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh }
}

/**
 * A marker to draw onto the snapshot, positioned in the source canvas's own pixel coordinates
 * (device pixels - i.e. already multiplied by the map's pixel ratio, matching
 * HTMLCanvasElement.width/height rather than its CSS width/height).
 *
 * Needed because ShelterLocationMap's markers are maplibre-gl `Marker` DOM elements layered on
 * top of the WebGL canvas via CSS transforms, not drawn into the canvas itself - map.getCanvas()
 * alone never contains them, so without compositing them back in here, the saved snapshot
 * silently loses every marker. See ShelterLocationMap.tsx's captureImage.
 */
export interface MarkerSnapshot {
  /** Drawn centered on this point, matching maplibre-gl's default "center" Marker anchor. */
  x: number
  y: number
  image: CanvasImageSource
  width: number
  height: number
}

/** Rasterizes an inline SVG string (as built by shelterMapIcons.ts) into a loaded image, ready
 * to pass as a MarkerSnapshot's `image` to captureMapSnapshot. */
export function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to rasterize marker SVG"))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/**
 * Downscales a live map canvas (e.g. ShelterLocationMap's maplibre-gl canvas) to a fixed small
 * size, composites the given markers on top (see MarkerSnapshot), and returns it as a JPEG Blob,
 * ready for SavedShelter.mapImage.
 *
 * Draws into a fresh offscreen canvas rather than mutating the source, since the source is the
 * map's own live rendering surface. Resolves null if a 2d context can't be obtained - the caller
 * treats that the same as "nothing to save" rather than throwing.
 */
export function captureMapSnapshot(
  source: HTMLCanvasElement,
  markers: MarkerSnapshot[] = [],
  width = MAP_SNAPSHOT_WIDTH,
  height = MAP_SNAPSHOT_HEIGHT
): Promise<Blob | null> {
  const target = document.createElement("canvas")
  target.width = width
  target.height = height
  const context = target.getContext("2d")
  if (!context) return Promise.resolve(null)

  const { sx, sy, sw, sh } = coverSourceRect(source.width, source.height, width, height)
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height)

  // Same crop+scale transform as the source canvas just went through, applied to each marker's
  // position so it lands on the same spot (relative to the map) as it did live.
  const scaleX = width / sw
  const scaleY = height / sh
  for (const marker of markers) {
    const markerWidth = marker.width * scaleX
    const markerHeight = marker.height * scaleY
    context.drawImage(
      marker.image,
      (marker.x - sx) * scaleX - markerWidth / 2,
      (marker.y - sy) * scaleY - markerHeight / 2,
      markerWidth,
      markerHeight
    )
  }

  return new Promise((resolve) => target.toBlob(resolve, "image/jpeg", 0.85))
}
