import { Paper, Text, Stack, RingProgress, Center, Grid } from '@mantine/core'
import { IconMoodSmile } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { BarChart } from '@mantine/charts'

interface SatisfactionMetrics {
  averageScore: number
  totalResponses: number
  distribution: {
    [key: number]: number // 1-5 ratings
  }
  trend: {
    date: string
    score: number
  }[]
}

export function SatisfactionScores() {
  const [metrics, setMetrics] = useState<SatisfactionMetrics>({
    averageScore: 0,
    totalResponses: 0,
    distribution: {},
    trend: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSatisfactionMetrics()

    const channel = supabase
      .channel('satisfaction_metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'satisfaction_ratings'
        },
        () => {
          fetchSatisfactionMetrics()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchSatisfactionMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('satisfaction_ratings')
        .select('score, created_at')
        .not('score', 'is', null)  // Only select ratings with non-null scores
        .order('created_at', { ascending: true })

      if (error) throw error

      // Calculate metrics
      const distribution: { [key: number]: number } = {}
      let sum = 0
      
      // Initialize distribution with all possible scores
      for (let i = 1; i <= 5; i++) {
        distribution[i] = 0
      }
      
      data.forEach(rating => {
        if (rating.score) {  // Extra safety check
          sum += rating.score
          distribution[rating.score] = (distribution[rating.score] || 0) + 1
        }
      })

      // Calculate monthly trend
      const trend = processMonthlyTrend(data)

      setMetrics({
        averageScore: data.length > 0 ? sum / data.length : 0,
        totalResponses: data.length,
        distribution,
        trend
      })
    } catch (err) {
      console.error('Error fetching satisfaction metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  const processMonthlyTrend = (data: any[]) => {
    const monthlyScores = new Map<string, { sum: number; count: number }>()
    const today = new Date()
    const twelveMonthsAgo = new Date(today.setMonth(today.getMonth() - 12))
    
    // Initialize all months in the range
    for (let d = new Date(twelveMonthsAgo); d <= new Date(); d.setMonth(d.getMonth() + 1)) {
      monthlyScores.set(d.toISOString().slice(0, 7), { sum: 0, count: 0 })
    }
    
    data.forEach(rating => {
      if (rating.score) {  // Only process ratings with scores
        const date = new Date(rating.created_at)
        if (date >= twelveMonthsAgo) {
          const month = date.toISOString().slice(0, 7)
          const current = monthlyScores.get(month) || { sum: 0, count: 0 }
          monthlyScores.set(month, {
            sum: current.sum + rating.score,
            count: current.count + 1
          })
        }
      }
    })

    return Array.from(monthlyScores.entries())
      .map(([date, { sum, count }]) => ({
        date,
        score: count > 0 ? sum / count : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Paper withBorder p="md" radius="md" style={{ minHeight: '400px' }}>
        <Text>Loading satisfaction metrics...</Text>
      </Paper>
    )
  }

  const distributionData = [1, 2, 3, 4, 5].map(score => ({
    rating: `${score} Star${score !== 1 ? 's' : ''}`,
    count: metrics.distribution[score] || 0
  }))

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="lg">
        <Text fw={500}>Customer Satisfaction</Text>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md" align="center">
              <RingProgress
                size={120}
                thickness={12}
                sections={[{ value: (metrics.averageScore / 5) * 100, color: 'green.6' }]}
                label={
                  <Center>
                    <Stack gap={0} align="center">
                      <IconMoodSmile size={24} style={{ color: 'var(--mantine-color-green-6)' }} />
                      <Text fw={700} size="xl">
                        {metrics.averageScore.toFixed(1)}
                      </Text>
                    </Stack>
                  </Center>
                }
              />
              <Stack gap={0} align="center">
                <Text>Average Score</Text>
                <Text size="sm" c="dimmed">
                  {metrics.totalResponses} responses
                </Text>
              </Stack>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            <BarChart
              h={200}
              data={distributionData}
              dataKey="rating"
              series={[
                { name: 'count', color: 'green.6' }
              ]}
              tickLine="y"
              gridAxis="y"
              tooltipProps={{
                content: ({ payload }) => {
                  if (!payload?.length) return null
                  const data = payload[0].payload as { rating: string; count: number }
                  return (
                    <Paper withBorder shadow="sm" p="sm" radius="md">
                      <Text size="sm" fw={500}>{data.rating}</Text>
                      <Text size="sm">{data.count} responses</Text>
                    </Paper>
                  )
                }
              }}
            />
          </Grid.Col>
        </Grid>

        <Stack gap="xs">
          <Text size="sm">Monthly Trend</Text>
          <BarChart
            h={200}
            data={metrics.trend}
            dataKey="date"
            series={[
              { name: 'score', color: 'green.6' }
            ]}
            tickLine="y"
            gridAxis="y"
            tooltipProps={{
              content: ({ payload }) => {
                if (!payload?.length) return null
                const data = payload[0].payload as { date: string; score: number }
                return (
                  <Paper withBorder shadow="sm" p="sm" radius="md">
                    <Text size="sm" fw={500}>{formatDate(data.date)}</Text>
                    <Text size="sm">{data.score.toFixed(1)} average rating</Text>
                  </Paper>
                )
              }
            }}
            xAxisProps={{
              tickFormatter: formatDate
            }}
            yAxisProps={{
              domain: [0, 5],
              tickCount: 6
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  )
} 