export type DetectionStatus = "KNOWN_LIKE" | "REVIEW_REQUIRED" | "ANOMALY_CANDIDATE" | string

export interface HealthResponse {
  status: string
  service: string
  model: string
  anomaly_engine: string
}

export interface Detection {
  detection_id: number
  yolo_class: string
  yolo_class_id: number
  yolo_confidence: number
  bbox: [number, number, number, number]
  feature_nearest_class: string
  feature_similarity: number
  class_baseline_p05: number
  class_baseline_p10: number
  models_agree: boolean
  similarity_status: string
  status: DetectionStatus
  human_verification_required: boolean
}

export interface AnalysisResponse {
  image: {
    filename: string
    width: number
    height: number
  }
  detection_count: number
  known_like_count: number
  review_required_count: number
  anomaly_candidate_count: number
  detections: Detection[]
  annotated_image: string
}

export interface MissionMetadata {
  missionId: string
  surveyLocation: string
  latitude: string
  longitude: string
  depth: string
  date: string
  time: string
  operator: string
  notes: string
}

export type ReviewDecision = "CONFIRMED_KNOWN" | "UNDER_REVIEW" | "CONFIRMED_ANOMALY_CANDIDATE"

export interface HistoryRecord {
  originalImage?: string
  id: string
  timestamp: string
  filename: string
  result: AnalysisResponse
  mission: MissionMetadata
}
