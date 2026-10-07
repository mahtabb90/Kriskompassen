const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000").replace(
  /\/+$/,
  ""
)

/**
 * Configures the backend address and the total time allowed for a response, including its body.
 *
 * Uses the local backend when VITE_API_BASE_URL is unset or empty. The timeout is in milliseconds.
 */
export const apiConfig = {
  baseUrl,
  vmaUrl: `${baseUrl}/api/v1/vmas`,
  timeoutMs: 10_000,
} as const
