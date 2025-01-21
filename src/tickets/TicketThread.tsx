import { useState, useEffect } from 'react'
import { Stack, Group, Button, Textarea, Text, Paper, Box } from '@mantine/core'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'

function AngleBracket() {
  return (
    <Box style={{ position: 'relative', width: '12px', height: '16px', display: 'flex', alignItems: 'center' }}>
      <Box
        style={{
          position: 'absolute',
          width: '2px',
          height: '8px',
          backgroundColor: 'currentColor',
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
          left: '2px',
          top: '2px'
        }}
      />
      <Box
        style={{
          position: 'absolute',
          width: '2px',
          height: '8px',
          backgroundColor: 'currentColor',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
          left: '2px',
          bottom: '2px'
        }}
      />
    </Box>
  )
}

interface TicketComment {
  id: string
  content: string
  created_at: string
  user_id: string
  is_internal: boolean
  user_profiles: {
    full_name: string
    role: string
  }
}

interface TicketThreadProps {
  ticketId: string
  ticket: {
    title: string
    status: any
    priority: any
  }
  onBack: () => void
}

export function TicketThread({ ticketId, ticket, onBack }: TicketThreadProps) {
  const [comments, setComments] = useState<TicketComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { userProfile } = useAuth()
//   const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'

  useEffect(() => {
    fetchComments()

    // Subscribe to changes in ticket_comments
    const channel = supabase
      .channel('ticket_comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [ticketId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select(`
          *,
          user_profiles(
            full_name,
            role
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error
      console.log('Fetched comments:', data) // Add logging to debug
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const { error } = await supabase.functions.invoke('handle-ticket-comment', {
        body: {
          ticket_id: ticketId,
          content: newComment.trim(),
          is_internal: false
        }
      })

      if (error) throw error
      
      setNewComment('')
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<AngleBracket />}
            onClick={onBack}
          >
            Back to Dashboard
          </Button>
          <Text size="xl" fw={600}>{ticket.title}</Text>
        </Group>
        <Group>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </Group>
      </Group>

      <Paper withBorder p="md">
        <Stack gap="md">
          {loading ? (
            <Text ta="center">Loading comments...</Text>
          ) : comments.length === 0 ? (
            <Text ta="center" c="dimmed">No comments yet</Text>
          ) : (
            comments.map((comment) => (
              <Paper 
                key={comment.id} 
                shadow="xs" 
                p="md"
                style={{
                  backgroundColor: comment.user_id === userProfile?.id ? '#f0f9ff' : 'white'
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {comment.user_profiles?.full_name || 'Unknown'} ({comment.user_profiles?.role || 'Unknown'})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(comment.created_at).toLocaleString()}
                    </Text>
                  </Group>
                  <Text>{comment.content}</Text>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Textarea
            placeholder="Type your message..."
            value={newComment}
            onChange={(e) => setNewComment(e.currentTarget.value)}
            minRows={3}
            maxRows={6}
            disabled={submitting}
          />
          <Group justify="flex-end">
            <Button 
              onClick={handleSubmit}
              loading={submitting}
            >
              Send Message
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
} 