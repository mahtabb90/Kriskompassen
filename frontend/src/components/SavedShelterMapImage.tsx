import { useEffect, useMemo } from "react"

interface SavedShelterMapImageProps {
  image: Blob
  alt: string
  className?: string
}

/**
 * Renders a saved shelter's map snapshot from its stored Blob (SavedShelter.mapImage).
 *
 * IndexedDB has no stable URL for a Blob, so this derives a short-lived object URL straight from
 * render (memoized, so it isn't recreated every render) and revokes it in a cleanup-only effect
 * on change/unmount - otherwise each one would leak for the page's lifetime.
 */
function SavedShelterMapImage({ image, alt, className }: SavedShelterMapImageProps) {
  const url = useMemo(() => URL.createObjectURL(image), [image])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return <img src={url} alt={alt} className={className} />
}

export default SavedShelterMapImage
