import { Paper, Text, Stack, Group, Progress } from '@mantine/core'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

interface ResponseMetrics {
  averageResponseTime: number
  averageResolutionTime: number
  responseTimePercentiles: {
    p50: number
    p75: number
    p90: number
  }
  resolutionTimePercentiles: {
    p50: number
    p75: number
    p90: number
  }
}

export function ResponseTimes() {
  const [metrics, setMetrics] = useState<ResponseMetrics>({
    averageResponseTime: 0,
    averageResolutionTime: 0,
    responseTimePercentiles: { p50: 0, p75: 0, p90: 0 },
    resolutionTimePercentiles: { p50: 0, p75: 0, p90: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResponseMetrics()

    const channel = supabase
      .channel('response_metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchResponseMetrics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchResponseMetrics = async () => {
    try {
      // Fetch tickets with their first response and resolution times
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          created_at,
          first_response_at,
          resolved_at,
          status
        `)
        .not('status', 'eq', 'open')

      if (error) throw error

      const responseTimes: number[] = []
      const resolutionTimes: number[] = []

      data.forEach(ticket => {
        if (ticket.first_response_at) {
          const responseTime = new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime()
          responseTimes.push(responseTime)
        }
        if (ticket.resolved_at) {
          const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()
          resolutionTimes.push(resolutionTime)
        }
      })

      // Calculate metrics
      const metrics: ResponseMetrics = {
        averageResponseTime: calculateAverage(responseTimes),
        averageResolutionTime: calculateAverage(resolutionTimes),
        responseTimePercentiles: calculatePercentiles(responseTimes),
        resolutionTimePercentiles: calculatePercentiles(resolutionTimes)
      }

      setMetrics(metrics)
    } catch (err) {
      console.error('Error fetching response metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverage = (times: number[]) => {
    if (times.length === 0) return 0
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  const calculatePercentiles = (times: number[]) => {
    if (times.length === 0) {
      return { p50: 0, p75: 0, p90: 0 }
    }

    const sorted = [...times].sort((a, b) => a - b)
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.9)]
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
        <Text>Loading response times...</Text>
      </Paper>
    )
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Text fw={500}>Response & Resolution Times</Text>

        <Stack gap="xs">
          <Text size="sm">Average First Response Time</Text>
          <Group gap="xs">
            <Text fw={700}>{formatDuration(metrics.averageResponseTime)}</Text>
          </Group>
          <Progress.Root size="sm">
            <Progress.Section 
              value={100} 
              color="blue"
            />
          </Progress.Root>
          <Group grow>
            <Text size="xs" c="dimmed">50th: {formatDuration(metrics.responseTimePercentiles.p50)}</Text>
            <Text size="xs" c="dimmed" ta="center">75th: {formatDuration(metrics.responseTimePercentiles.p75)}</Text>
            <Text size="xs" c="dimmed" ta="right">90th: {formatDuration(metrics.responseTimePercentiles.p90)}</Text>
          </Group>
        </Stack>

        <Stack gap="xs">
          <Text size="sm">Average Resolution Time</Text>
          <Group gap="xs">
            <Text fw={700}>{formatDuration(metrics.averageResolutionTime)}</Text>
          </Group>
          <Progress.Root size="sm">
            <Progress.Section 
              value={100} 
              color="green"
            />
          </Progress.Root>
          <Group grow>
            <Text size="xs" c="dimmed">50th: {formatDuration(metrics.resolutionTimePercentiles.p50)}</Text>
            <Text size="xs" c="dimmed" ta="center">75th: {formatDuration(metrics.resolutionTimePercentiles.p75)}</Text>
            <Text size="xs" c="dimmed" ta="right">90th: {formatDuration(metrics.resolutionTimePercentiles.p90)}</Text>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  )
} 