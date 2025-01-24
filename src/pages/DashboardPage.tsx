import { Stack, Grid } from '@mantine/core'
import { TicketMetrics } from '../components/dashboard/TicketMetrics'
import { ResponseTimes } from '../components/dashboard/ResponseTimes'
import { AgentPerformance } from '../components/dashboard/AgentPerformance'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { FadeIn } from '../components'

export function DashboardPage() {
  return (
    <Stack gap="xl">
      <FadeIn delay={300}>
        <TicketMetrics />
      </FadeIn>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FadeIn delay={600}>
            <ResponseTimes />
          </FadeIn>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FadeIn delay={600}>
            <AgentPerformance />
          </FadeIn>
        </Grid.Col>
      </Grid>

      <FadeIn delay={900}>
        <RecentActivity />
      </FadeIn>
    </Stack>
  )
} 