import { Paper, Text, Stack, Group, Progress, Avatar } from '@mantine/core'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

interface AgentMetrics {
  id: string
  fullName: string
  avatar?: string
  resolvedCount: number
  averageResponseTime: number
  customerSatisfaction: number
  activeTickets: number
}

export function AgentPerformance() {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgentMetrics()

    const channel = supabase
      .channel('agent_metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchAgentMetrics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchAgentMetrics = async () => {
    try {
      // First get all agents
      const { data: agents, error: agentError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['agent', 'admin'])

      if (agentError) throw agentError

      // Then get their ticket metrics
      const agentMetrics = await Promise.all(
        agents.map(async (agent) => {
          // Get resolved tickets count
          const { data: resolvedTickets, error: resolvedError } = await supabase
            .from('tickets')
            .select('id')
            .eq('assigned_to', agent.id)
            .in('status', ['resolved', 'closed'])

          if (resolvedError) throw resolvedError

          // Get active tickets
          const { data: activeTickets, error: activeError } = await supabase
            .from('tickets')
            .select('id')
            .eq('assigned_to', agent.id)
            .in('status', ['open', 'in_progress'])

          if (activeError) throw activeError

          // Calculate average response time
          const { data: tickets } = await supabase
            .from('tickets')
            .select('created_at, first_response_at')
            .eq('assigned_to', agent.id)
            .not('first_response_at', 'is', null)

          let avgResponseTime = 0
          if (tickets && tickets.length > 0) {
            const responseTimes = tickets.map(ticket => 
              new Date(ticket.first_response_at!).getTime() - new Date(ticket.created_at).getTime()
            )
            avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          }

          // Get satisfaction ratings for resolved tickets
          const { data: ratings } = await supabase
            .from('satisfaction_ratings')
            .select('score')
            .not('score', 'is', null)
            .in('ticket_id', resolvedTickets?.map(t => t.id) || [])

          // Calculate customer satisfaction (0-100%)
          let customerSatisfaction = 0
          if (ratings && ratings.length > 0) {
            const validRatings = ratings.filter(r => r.score != null)
            if (validRatings.length > 0) {
              const avgRating = validRatings.reduce((sum, r) => sum + r.score!, 0) / validRatings.length
              // Convert 1-5 scale to 0-100%
              customerSatisfaction = Math.round(((avgRating - 1) / 4) * 100)
            }
          }

          return {
            id: agent.id,
            fullName: agent.full_name,
            avatar: agent.avatar_url,
            resolvedCount: resolvedTickets?.length || 0,
            averageResponseTime: avgResponseTime,
            customerSatisfaction,
            activeTickets: activeTickets?.length || 0
          }
        })
      )

      setMetrics(agentMetrics)
    } catch (err) {
      console.error('Error fetching agent metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <Paper withBorder p="md" radius="md" style={{ minHeight: '300px' }}>
        <Text>Loading agent performance...</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Text fw={500}>Agent Performance</Text>

        {metrics.map((agent) => (
          <Paper key={agent.id} withBorder p="md" radius="sm">
            <Stack gap="md">
              <Group>
                <Avatar src={agent.avatar} radius="xl">{agent.fullName.charAt(0)}</Avatar>
                <div style={{ flex: 1 }}>
                  <Text fw={500}>{agent.fullName}</Text>
                  <Text size="sm" c="dimmed">{agent.activeTickets} active tickets</Text>
                </div>
                <Stack gap={0} align="flex-end">
                  <Text fw={500}>{agent.resolvedCount}</Text>
                  <Text size="xs" c="dimmed">resolved</Text>
                </Stack>
              </Group>

              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="sm">Avg. Response Time</Text>
                  <Text size="sm">{formatDuration(agent.averageResponseTime)}</Text>
                </Group>
                <Progress
                  value={100}
                  color="blue"
                  size="sm"
                />

                <Group justify="space-between" align="center">
                  <Text size="sm">Customer Satisfaction</Text>
                  <Text size="sm">{agent.customerSatisfaction}%</Text>
                </Group>
                <Progress
                  value={agent.customerSatisfaction}
                  color={agent.customerSatisfaction >= 90 ? 'green' : agent.customerSatisfaction >= 75 ? 'yellow' : 'red'}
                  size="sm"
                />
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  )
} 