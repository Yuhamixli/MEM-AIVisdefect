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
  count: number
  items: KnowledgeItem[]
}
