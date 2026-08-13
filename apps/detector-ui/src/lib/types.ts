export type ReviewStatus = 'pending' | 'confirmed' | 'rejected' | 'relabelled'

export type Point = [number, number]
export type BBox = [number, number, number, number]

export interface Defect {
  defect_id: string
  slug: string
  class_name?: string
  bbox: BBox
  confidence: number
  severity_hint?: string
  severity?: string
  mask?: Point[]
  review_status: string
}

export interface Face {
  face: string
  image: string
  image_size: [number, number]
  defects: Defect[]
}

export interface JobDetail {
  piece_id: string
  batch_id: string
  faces: Face[]
  detected_at: string
  model_version: string
  review_status: string
}

export interface JobRow {
  piece_id: string
  batch: string
  faces: number
  defects: number
  model_version: string
  ts: string
  review_status: string
  max_confidence?: number
  has_low_conf?: boolean
}

export interface JobsIndex {
  updated_at?: string
  note?: string
  jobs: JobRow[]
}

export interface ReviewOverride {
  piece_id: string
  defect_id: string
  action: 'confirm' | 'reject' | 'relabel'
  new_slug?: string
  note?: string
  reviewer?: string
  ts: string
}

export interface UiConfig {
  confidence_low_threshold: number
  confidence_review_threshold: number
  bi_url: string
}
