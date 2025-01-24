import { Paper, Text, Stack, Group, Select } from '@mantine/core'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { LineChart } from '@mantine/charts'

interface VolumeData {
  date: string
  count: number
}

interface VolumeMetrics {
  daily: VolumeData[]
  weekly: VolumeData[]
  monthly: VolumeData[]
}

export function TicketVolume() {
  const [timeframe, setTimeframe] = useState<string>('weekly')
  const [metrics, setMetrics] = useState<VolumeMetrics>({
    daily: [],
    weekly: [],
    monthly: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVolumeMetrics()

    const channel = supabase
      .channel('ticket_volume')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchVolumeMetrics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchVolumeMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Process data for different timeframes
      const daily = processDaily(data)
      const weekly = processWeekly(data)
      const monthly = processMonthly(data)

      setMetrics({ daily, weekly, monthly })
    } catch (err) {
      console.error('Error fetching volume metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const processDaily = (data: any[]): VolumeData[] => {
    const counts = new Map<string, number>()
    const today = new Date()
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30))
    
    // Initialize all dates in the range
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      counts.set(d.toISOString().split('T')[0], 0)
    }
    
    data.forEach(ticket => {
      const date = new Date(ticket.created_at).toISOString().split('T')[0]
      if (new Date(date) >= thirtyDaysAgo) {
        counts.set(date, (counts.get(date) || 0) + 1)
      }
    })

    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const processWeekly = (data: any[]): VolumeData[] => {
    const counts = new Map<string, number>()
    const today = new Date()
    const twelveWeeksAgo = new Date(today.setDate(today.getDate() - 84))
    
    // Initialize all weeks in the range
    for (let d = new Date(twelveWeeksAgo); d <= new Date(); d.setDate(d.getDate() + 7)) {
      counts.set(getWeekNumber(d), 0)
    }
    
    data.forEach(ticket => {
      const date = new Date(ticket.created_at)
      if (date >= twelveWeeksAgo) {
        const week = getWeekNumber(date)
        counts.set(week, (counts.get(week) || 0) + 1)
      }
    })

    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const processMonthly = (data: any[]): VolumeData[] => {
    const counts = new Map<string, number>()
    const today = new Date()
    const twelveMonthsAgo = new Date(today.setMonth(today.getMonth() - 12))
    
    // Initialize all months in the range
    for (let d = new Date(twelveMonthsAgo); d <= new Date(); d.setMonth(d.getMonth() + 1)) {
      counts.set(d.toISOString().slice(0, 7), 0)
    }
    
    data.forEach(ticket => {
      const date = new Date(ticket.created_at)
      if (date >= twelveMonthsAgo) {
        const month = date.toISOString().slice(0, 7)
        counts.set(month, (counts.get(month) || 0) + 1)
      }
    })

    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const getWeekNumber = (date: Date): string => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
  }

  const formatDate = (date: string): string => {
    if (timeframe === 'daily') {
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (timeframe === 'weekly') {
      const [week] = date.split('-W')
      return `Week ${week}`
    } else {
      const [year, month] = date.split('-')
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }

  if (loading) {
    return (
      <Paper withBorder p="md" radius="md" style={{ minHeight: '400px' }}>
        <Text>Loading volume metrics...</Text>
      </Paper>
    )
  }

  const currentData = metrics[timeframe as keyof VolumeMetrics]
  const maxCount = Math.max(...currentData.map(d => d.count))

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Text fw={500}>Ticket Volume</Text>
          <Select
            value={timeframe}
            onChange={(value) => setTimeframe(value || 'weekly')}
            data={[
              { value: 'daily', label: 'Daily (30 days)' },
              { value: 'weekly', label: 'Weekly (12 weeks)' },
              { value: 'monthly', label: 'Monthly (12 months)' }
            ]}
            size="xs"
          />
        </Group>

        <LineChart
          h={300}
          data={currentData}
          dataKey="date"
          series={[
            { name: 'count', color: 'blue.6' }
          ]}
          tickLine="y"
          gridAxis="xy"
          curveType="monotone"
          dotProps={{ r: 4, fill: 'white', strokeWidth: 2 }}
          tooltipProps={{
            content: ({ payload }) => {
              if (!payload?.length) return null
              const data = payload[0].payload as VolumeData
              return (
                <Paper withBorder shadow="sm" p="sm" radius="md">
                  <Text size="sm" fw={500}>{formatDate(data.date)}</Text>
                  <Text size="sm">{data.count} tickets</Text>
                </Paper>
              )
            }
          }}
          xAxisProps={{
            tickFormatter: formatDate
          }}
          yAxisProps={{
            domain: [0, maxCount + 1],
            tickCount: 5
          }}
        />
      </Stack>
    </Paper>
  )
} 