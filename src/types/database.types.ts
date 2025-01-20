export type UserRole = 'admin' | 'agent' | 'customer'

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface TicketTag {
  ticket_id: string
  tag: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  content: string
  is_internal: boolean
  created_at: string
}

export interface TicketHistory {
  id: string
  ticket_id: string
  user_id: string
  action: string
  details: Record<string, any>
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
      tickets: {
        Row: Ticket
        Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>>
      }
      ticket_tags: {
        Row: TicketTag
        Insert: TicketTag
        Update: Partial<TicketTag>
      }
      ticket_comments: {
        Row: TicketComment
        Insert: Omit<TicketComment, 'id' | 'created_at'>
        Update: Partial<Omit<TicketComment, 'id' | 'created_at'>>
      }
      ticket_history: {
        Row: TicketHistory
        Insert: Omit<TicketHistory, 'id' | 'created_at'>
        Update: never
      }
    }
  }
} 