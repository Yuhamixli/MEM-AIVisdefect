import type { UiConfig } from './types'
import { publicUrl } from './paths'

const DEFAULTS: UiConfig = {
  confidence_low_threshold: 0.5,
  confidence_review_threshold: 0.7,
  bi_url: 'http://127.0.0.1:5173',
}

let cached: UiConfig | null = null

export async function loadUiConfig(): Promise<UiConfig> {
  if (cached) return cached
  try {
    const res = await fetch(publicUrl('/detector-ui.config.json'))
    if (!res.ok) {
      cached = DEFAULTS
      return cached
    }
    const raw = (await res.json()) as Partial<UiConfig>
    cached = { ...DEFAULTS, ...raw }
    return cached
  } catch {
    cached = DEFAULTS
    return cached
  }
}

export function confBand(c: number, low = 0.5): 'low' | 'mid' | 'high' {
  if (!Number.isFinite(c) || c < 0 || c > 1) return 'low'
  if (c < low) return 'low'
  if (c < 0.75) return 'mid'
  return 'high'
}
