import { Paper, Text, Stack, Group, Timeline, Avatar } from '@mantine/core'
import { IconMessageCircle2, IconCheck, IconClock } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

interface Activity {
  id: string
  type: 'comment' | 'status_change' | 'assignment'
  ticketId: string
  ticketTitle: string
  userId: string
  userName: string
  userAvatar?: string
  timestamp: string
  details: string
}

interface TicketData {
  id: string
  title: string
  status: string
  assigned_to: string
  updated_at: string
  user_profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface CommentData {
  id: string
  ticket_id: string
  content: string
  created_at: string
  user_id: string
  tickets: {
    title: string
  }
  user_profiles: {
    full_name: string
    avatar_url: string | null
  }
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecentActivity()

    const channel = supabase
      .channel('recent_activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchRecentActivity()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent ticket updates
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          status,
          assigned_to,
          updated_at,
          user_profiles!assigned_to (
            full_name,
            avatar_url
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(10)
        .returns<TicketData[]>()

      if (ticketError) throw ticketError

      // Fetch recent comments
      const { data: comments, error: commentError } = await supabase
        .from('ticket_comments')
        .select(`
          id,
          ticket_id,
          content,
          created_at,
          user_id,
          tickets!inner (
            title
          ),
          user_profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
        .returns<CommentData[]>()

      if (commentError) throw commentError

      // Combine and sort activities
      const activities: Activity[] = [
        ...(tickets || []).map(ticket => ({
          id: `ticket-${ticket.id}`,
          type: 'status_change' as const,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          userId: ticket.assigned_to,
          userName: ticket.user_profiles?.full_name || 'Unknown',
          userAvatar: ticket.user_profiles?.avatar_url || undefined,
          timestamp: ticket.updated_at,
          details: `Status updated to ${ticket.status}`
        })),
        ...(comments || []).map(comment => ({
          id: `comment-${comment.id}`,
          type: 'comment' as const,
          ticketId: comment.ticket_id,
          ticketTitle: comment.tickets.title,
          userId: comment.user_id,
          userName: comment.user_profiles.full_name,
          userAvatar: comment.user_profiles.avatar_url || undefined,
          timestamp: comment.created_at,
          details: comment.content
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      setActivities(activities)
    } catch (err) {
      console.error('Error fetching recent activity:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'comment':
        return <IconMessageCircle2 size={16} />
      case 'status_change':
        return <IconCheck size={16} />
      case 'assignment':
        return <IconClock size={16} />
    }
  }

  if (loading) {
    return (
      <Paper withBorder p="md" radius="md" style={{ minHeight: '400px' }}>
        <Text>Loading recent activity...</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Text fw={500}>Recent Activity</Text>

        <Timeline active={activities.length - 1} bulletSize={24} lineWidth={2}>
          {activities.map((activity) => (
            <Timeline.Item
              key={activity.id}
              bullet={getActivityIcon(activity.type)}
              title={
                <Group gap="xs">
                  <Avatar 
                    src={activity.userAvatar} 
                    size="sm" 
                    radius="xl"
                  >
                    {activity.userName.charAt(0)}
                  </Avatar>
                  <Text size="sm" fw={500}>
                    {activity.userName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    on
                  </Text>
                  <Text 
                    size="sm" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${activity.ticketId}`)}
                  >
                    {activity.ticketTitle}
                  </Text>
                </Group>
              }
            >
              <Text size="sm" mt={4}>
                {activity.details}
              </Text>
              <Text size="xs" mt={4} c="dimmed">
                {formatTimestamp(activity.timestamp)}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      </Stack>
    </Paper>
  )
} 