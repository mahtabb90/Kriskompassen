import { setWorkerUrl } from "maplibre-gl"
// MapLibre v6 resolves its worker relative to its own module URL, which Vite's dev-server
// dependency pre-bundling does not serve - a well-documented incompatibility (not specific to
// this app). ?worker&url makes Vite emit the worker as its own self-contained bundled file (a
// plain ?url import misses the worker's internal maplibre-gl-shared.mjs import in production
// builds), and setWorkerUrl() must be called with that URL before any Map is constructed.
// Centralized here (a module every map component already imports) so it runs exactly once,
// regardless of which map component mounts first - see vite.config.ts's worker.format: "es".
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

setWorkerUrl(maplibreWorkerUrl)

/**
 * Configures the embedded shelter map's tile source.
 *
 * OpenFreeMap's public instance (https://openfreemap.org) is free, key-less and has no request
 * quota - unlike a key-based provider (e.g. Stadia Maps), there is no risk of the map breaking
 * under a usage spike during an actual crisis, which is exactly when this app matters most. The
 * tradeoff, already weighed: no SLA, run by a single maintainer funded by donations rather than
 * a company - accepted for this project. Matches the same style used by the KrisKompassen team's
 * sister project (IntresseKlubben)'s MapLibre GL integration.
 */
export const mapConfig = {
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
} as const
