const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000").replace(
  /\/+$/,
  ""
)

/**
 * Configures the backend address, the total time allowed for a response, including its body, and
 * the VMA polling interval.
 *
 * Uses the local backend when VITE_API_BASE_URL is unset or empty. Durations are in milliseconds.
 * The polling interval only sets how often this app asks our backend; the backend's shared cache
 * limits calls to Sveriges Radio regardless of how many clients poll.
 */
export const apiConfig = {
  baseUrl,
  vmaUrl: `${baseUrl}/api/v1/vmas`,
  geocodeUrl: `${baseUrl}/api/v1/geocode`,
  crisisUrl: `${baseUrl}/api/v1/crisis`,
  timeoutMs: 10_000,
  vmaPollIntervalMs: 30_000,
} as const
