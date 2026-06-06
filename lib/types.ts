export type PostStatus = 'draft' | 'approved' | 'posted'
export type PostSource = 'auto' | 'manual'

export interface Post {
  id: string
  content: string
  status: PostStatus
  source: PostSource
  context_tag: string | null
  target_date: string | null
  raw_input: string | null
  created_at: string
  posted_at: string | null
}
