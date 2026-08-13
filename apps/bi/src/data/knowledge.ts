export interface KnowledgeItem {
  id: string
  title: string
  category: string
  description: string
  source: string
  path: string
}

export interface KnowledgeIndex {
  updated_at: string
  feishu_pulled_at?: string | null
  curated_count?: number
  feishu_count?: number
  count: number
  items: KnowledgeItem[]
}
