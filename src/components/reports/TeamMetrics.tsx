import { Paper, Text, Stack, Table, Badge } from '@mantine/core'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { BarChart } from '@mantine/charts'

interface AgentMetrics {
  id: string
  name: string
  assignedTickets: number
  resolvedTickets: number
  averageResponseTime: number
  satisfactionScore: number
}

interface TeamMetricsData {
  agents: AgentMetrics[]
  workloadDistribution: {
    agent: string
    open: number
    inProgress: number
    resolved: number
  }[]
}

export function TeamMetrics() {
  const [metrics, setMetrics] = useState<TeamMetricsData>({
    agents: [],
    workloadDistribution: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeamMetrics()

    const channel = supabase
      .channel('team_metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTeamMetrics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchTeamMetrics = async () => {
    try {
      // Fetch agents
      const { data: agents, error: agentsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'agent')

      if (agentsError) throw agentsError

      // Fetch tickets with agent assignments
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          assigned_to,
          status,
          created_at,
          first_response_at,
          resolved_at
        `)

      if (ticketsError) throw ticketsError

      // Fetch satisfaction ratings
      const { data: ratings, error: ratingsError } = await supabase
        .from('satisfaction_ratings')
        .select('ticket_id, score')

      if (ratingsError) throw ratingsError

      // Process metrics for each agent
      const agentMetrics = agents.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_to === agent.id)
        const resolvedTickets = agentTickets.filter(t => t.status === 'resolved' || t.status === 'closed')
        
        // Calculate average response time
        const responseTimes = agentTickets
          .filter(t => t.first_response_at)
          .map(t => new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime())
        
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0

        // Calculate satisfaction score
        const agentRatings = ratings
          .filter(r => {
            const ticket = tickets.find(t => t.id === r.ticket_id)
            return ticket && ticket.assigned_to === agent.id
          })
          .map(r => r.score)

        const avgSatisfaction = agentRatings.length > 0
          ? agentRatings.reduce((a, b) => a + b, 0) / agentRatings.length
          : 0

        return {
          id: agent.id,
          name: agent.full_name,
          assignedTickets: agentTickets.length,
          resolvedTickets: resolvedTickets.length,
          averageResponseTime: avgResponseTime,
          satisfactionScore: avgSatisfaction
        }
      })

      // Process workload distribution
      const workloadDistribution = agents.map(agent => {
        const agentTickets = tickets.filter(t => t.assigned_to === agent.id)
        return {
          agent: agent.full_name,
          open: agentTickets.filter(t => t.status === 'open').length,
          inProgress: agentTickets.filter(t => t.status === 'in_progress').length,
          resolved: agentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
        }
      })

      setMetrics({
        agents: agentMetrics.sort((a, b) => b.assignedTickets - a.assignedTickets),
        workloadDistribution: workloadDistribution.sort((a, b) => 
          (b.open + b.inProgress + b.resolved) - (a.open + a.inProgress + a.resolved)
        )
      })
    } catch (err) {
      console.error('Error fetching team metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getSatisfactionColor = (score: number): string => {
    if (score >= 4.5) return 'green'
    if (score >= 4.0) return 'teal'
    if (score >= 3.5) return 'yellow'
    if (score >= 3.0) return 'orange'
    return 'red'
  }

  if (loading) {
    return (
      <Paper withBorder p="md" radius="md" style={{ minHeight: '400px' }}>
        <Text>Loading team metrics...</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Text fw={500}>Team Performance</Text>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Agent</Table.Th>
              <Table.Th>Assigned</Table.Th>
              <Table.Th>Resolved</Table.Th>
              <Table.Th>Avg Response</Table.Th>
              <Table.Th>CSAT</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {metrics.agents.map(agent => (
              <Table.Tr key={agent.id}>
                <Table.Td>{agent.name}</Table.Td>
                <Table.Td>{agent.assignedTickets}</Table.Td>
                <Table.Td>{agent.resolvedTickets}</Table.Td>
                <Table.Td>{formatDuration(agent.averageResponseTime)}</Table.Td>
                <Table.Td>
                  <Badge 
                    color={getSatisfactionColor(agent.satisfactionScore)}
                    variant="light"
                  >
                    {agent.satisfactionScore.toFixed(1)}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Stack gap="xs">
          <Text size="sm">Workload Distribution</Text>
          <BarChart
            h={300}
            data={metrics.workloadDistribution}
            dataKey="agent"
            type="stacked"
            series={[
              { name: 'open', color: 'red.6' },
              { name: 'inProgress', color: 'yellow.6' },
              { name: 'resolved', color: 'green.6' }
            ]}
            tickLine="y"
            gridAxis="y"
            tooltipProps={{
              content: ({ payload }) => {
                if (!payload?.length) return null
                const data = payload[0].payload as TeamMetricsData['workloadDistribution'][0]
                const total = data.open + data.inProgress + data.resolved
                return (
                  <Paper withBorder shadow="sm" p="sm" radius="md">
                    <Text size="sm" fw={500}>{data.agent}</Text>
                    <Stack gap={2}>
                      <Text size="sm">Open: {data.open}</Text>
                      <Text size="sm">In Progress: {data.inProgress}</Text>
                      <Text size="sm">Resolved: {data.resolved}</Text>
                      <Text size="sm" fw={500}>Total: {total}</Text>
                    </Stack>
                  </Paper>
                )
              }
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  )
} 