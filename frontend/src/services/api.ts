import type { AnalysisResponse, HealthResponse } from "../types/trinetra"

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000"

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

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal })
  const data = await parseResponse<HealthResponse>(response)
  if (typeof data.status !== "string" || typeof data.model !== "string") {
    throw new Error("Unexpected health response")
  }
  return data
}

export async function analyzeImage(file: File): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch(`${API_BASE_URL}/analyze`, {
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
}
