import { Grid, Paper, Text, Group, Stack, RingProgress, Center } from '@mantine/core'
import { IconTicket, IconCheck, IconClock } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { TicketStatus } from '../../types/database.types'

interface TicketStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
}

export function TicketMetrics() {
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTicketStats()

    const channel = supabase
      .channel('ticket_stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTicketStats()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchTicketStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('status')

      if (error) throw error

      const stats = data.reduce((acc: TicketStats, ticket) => {
        acc.total++
        switch (ticket.status as TicketStatus) {
          case 'open':
            acc.open++
            break
          case 'in_progress':
            acc.inProgress++
            break
          case 'resolved':
            acc.resolved++
            break
          case 'closed':
            acc.closed++
            break
        }
        return acc
      }, {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0
      })

      setStats(stats)
    } catch (err) {
      console.error('Error fetching ticket stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculatePercentage = (value: number) => {
    return stats.total > 0 ? Math.round((value / stats.total) * 100) : 0
  }

  if (loading) {
    return (
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <Paper withBorder p="md" radius="md" style={{ minHeight: '104px' }}>
            <Text>Loading metrics...</Text>
          </Paper>
        </Grid.Col>
      </Grid>
    )
  }

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Total Tickets
              </Text>
              <Text fw={700} size="xl">
                {stats.total}
              </Text>
              <Text size="xs" c="dimmed">
                {stats.open + stats.inProgress} unresolved
              </Text>
            </Stack>
            <IconTicket size={32} color="gray" />
          </Group>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Open Tickets
              </Text>
              <Text fw={700} size="xl">
                {stats.open}
              </Text>
              <Text size="xs" c="dimmed">
                {calculatePercentage(stats.open)}% of total
              </Text>
            </Stack>
            <RingProgress
              size={64}
              thickness={4}
              sections={[{ value: calculatePercentage(stats.open), color: 'blue' }]}
              label={
                <Center>
                  <IconClock size={20} color="gray" />
                </Center>
              }
            />
          </Group>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                In Progress
              </Text>
              <Text fw={700} size="xl">
                {stats.inProgress}
              </Text>
              <Text size="xs" c="dimmed">
                {calculatePercentage(stats.inProgress)}% of total
              </Text>
            </Stack>
            <RingProgress
              size={64}
              thickness={4}
              sections={[{ value: calculatePercentage(stats.inProgress), color: 'yellow' }]}
              label={
                <Center>
                  <IconClock size={20} color="gray" />
                </Center>
              }
            />
          </Group>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Resolved
              </Text>
              <Text fw={700} size="xl">
                {stats.resolved + stats.closed}
              </Text>
              <Text size="xs" c="dimmed">
                {calculatePercentage(stats.resolved + stats.closed)}% of total
              </Text>
            </Stack>
            <RingProgress
              size={64}
              thickness={4}
              sections={[{ value: calculatePercentage(stats.resolved + stats.closed), color: 'green' }]}
              label={
                <Center>
                  <IconCheck size={20} color="gray" />
                </Center>
              }
            />
          </Group>
        </Paper>
      </Grid.Col>
    </Grid>
  )
} 