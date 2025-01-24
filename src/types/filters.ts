import { TicketStatus, TicketPriority } from './database.types'

export type TagSearchMode = 'and' | 'or'

export interface FilterState {
  status: TicketStatus[] | 'all'
  priority: TicketPriority[] | 'all'
  assignedTo: string | null
  tags: string[]
  search: string
  tagSearchMode: TagSearchMode
} 