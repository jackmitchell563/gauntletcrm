import { Container, Paper, Stack, Text, Grid, Tabs } from '@mantine/core'
import { IconChartBar, IconMoodSmile, IconUsers } from '@tabler/icons-react'
import { FadeIn } from '../components'
import { TicketVolume } from '../components/reports/TicketVolume'
import { SatisfactionScores } from '../components/reports/SatisfactionScores'
import { TeamMetrics } from '../components/reports/TeamMetrics'

export function ReportsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <FadeIn>
          <Paper withBorder p="md" radius="md">
            <Stack gap="lg">
              <Text size="xl" fw={600}>Reports & Analytics</Text>
              
              <Tabs defaultValue="overview">
                <Tabs.List>
                  <Tabs.Tab 
                    value="overview" 
                    leftSection={<IconChartBar size={16} />}
                  >
                    Overview
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="satisfaction" 
                    leftSection={<IconMoodSmile size={16} />}
                  >
                    Customer Satisfaction
                  </Tabs.Tab>
                  <Tabs.Tab 
                    value="team" 
                    leftSection={<IconUsers size={16} />}
                  >
                    Team Performance
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="overview" pt="xl">
                  <Grid>
                    <Grid.Col span={12}>
                      <FadeIn delay={100}>
                        <TicketVolume />
                      </FadeIn>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <FadeIn delay={200}>
                        <SatisfactionScores />
                      </FadeIn>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <FadeIn delay={300}>
                        <TeamMetrics />
                      </FadeIn>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="satisfaction" pt="xl">
                  <FadeIn>
                    <SatisfactionScores />
                  </FadeIn>
                </Tabs.Panel>

                <Tabs.Panel value="team" pt="xl">
                  <FadeIn>
                    <TeamMetrics />
                  </FadeIn>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Paper>
        </FadeIn>
      </Stack>
    </Container>
  )
} 