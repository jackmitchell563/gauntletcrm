export type UserRole = 'admin' | 'agent' | 'customer'

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
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
        Row: {
          id: string
          title: string
          description: string | null
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_by: string
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
      }
      // Add other tables as needed
    }
  }
} 