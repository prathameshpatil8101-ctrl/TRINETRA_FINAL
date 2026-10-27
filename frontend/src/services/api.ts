import type { AnalysisResponse, HealthResponse } from "../types/trinetra"

const STORAGE_KEY = "trinetra_api_url"

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

export function getDefaultApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined) || ""
  return envUrl ? normalizeUrl(envUrl) : "http://localhost:8000"
}

export function getCustomApiBaseUrl(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeUrl(stored) : null
  } catch {
    return null
  }
}

export function setCustomApiBaseUrl(url: string | null): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY, normalizeUrl(url))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // LocalStorage might be restricted
  }
}

export function getApiBaseUrl(): string {
  return getCustomApiBaseUrl() || getDefaultApiBaseUrl()
}

// Deprecated export maintained for backwards compatibility
export const API_BASE_URL = getApiBaseUrl()

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  const data = (await response.json()) as T
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected backend response")
  }
  return data
}

function handleFetchError(error: unknown, baseUrl: string): Error {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return new Error(
        `Connection timed out while reaching ${baseUrl}. If the backend is running on Render free tier, it may need up to 60s to wake from sleep.`
      )
    }
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return new Error(
        `Unable to reach backend at ${baseUrl}. Check your internet connection, verify the backend is live on Render, and ensure CORS is allowed.`
      )
    }
    return error
  }
  return new Error("Unexpected network error.")
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const baseUrl = getApiBaseUrl()
  try {
    const response = await fetch(`${baseUrl}/health`, { signal })
    const data = await parseResponse<HealthResponse>(response)
    if (typeof data.status !== "string" || typeof data.model !== "string") {
      throw new Error("Unexpected health response")
    }
    return data
  } catch (error) {
    throw handleFetchError(error, baseUrl)
  }
}

export async function analyzeImage(file: File): Promise<AnalysisResponse> {
  const baseUrl = getApiBaseUrl()
  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      body: formData,
    })
    const data = await parseResponse<AnalysisResponse>(response)
    if (
      !data.image ||
      !Array.isArray(data.detections) ||
      typeof data.detection_count !== "number" ||
      typeof data.annotated_image !== "string"
    ) {
      throw new Error("Unexpected analysis response")
    }
    return data
  } catch (error) {
    throw handleFetchError(error, baseUrl)
  }
}
