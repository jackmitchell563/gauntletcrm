import { Button, Container, Title, Text, Stack, Group, AppShell, Burger, Anchor, rem, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useWindowScroll } from '@mantine/hooks'
import styles from './HomePage.module.css'
import { WaveBackground } from '../components/WaveBackground'

function Navbar({ onGetStarted }: { onGetStarted: () => void }) {
  const [opened, { toggle }] = useDisclosure()
  const [scroll] = useWindowScroll()
  
  const hasScrolled = scroll.y > 0

  return (
    <Box 
      component="nav" 
      py="md"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'white',
        transition: 'box-shadow 0.2s ease',
        boxShadow: hasScrolled ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none'
      }}
    >
      <Container size="lg">
        <Group justify="space-between" align="center">
          <Title order={3} className={styles.gradientText}>GauntletCRM</Title>
          <Group gap="xl" visibleFrom="sm">
            <Anchor href="#features" c="dimmed">Features</Anchor>
            <Anchor href="#pricing" c="dimmed">Pricing</Anchor>
            <Anchor href="#about" c="dimmed">About</Anchor>
            <Button onClick={onGetStarted}>Sign In</Button>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
      </Container>
    </Box>
  )
}

function Footer() {
  return (
    <Box 
      component="footer" 
      py="xl" 
      style={{ 
        borderTop: '1px solid #eee',
        position: 'relative',
        zIndex: 1
      }}
    >
      <Container size="lg">
        <Group justify="space-between" align="start">
          <Stack gap="xs">
            <Title order={4}>GauntletCRM</Title>
            <Text size="sm" c="dimmed" maw={300}>
              Streamline your customer support workflow with our modern, efficient CRM solution.
            </Text>
          </Stack>
          
          <Group gap={rem(60)}>
            <Stack gap="xs">
              <Text fw={500}>Product</Text>
              <Stack gap={8}>
                <Anchor href="#features" c="dimmed" size="sm">Features</Anchor>
                <Anchor href="#pricing" c="dimmed" size="sm">Pricing</Anchor>
                <Anchor href="#roadmap" c="dimmed" size="sm">Roadmap</Anchor>
              </Stack>
            </Stack>

            <Stack gap="xs">
              <Text fw={500}>Company</Text>
              <Stack gap={8}>
                <Anchor href="#about" c="dimmed" size="sm">About</Anchor>
                <Anchor href="#blog" c="dimmed" size="sm">Blog</Anchor>
                <Anchor href="#careers" c="dimmed" size="sm">Careers</Anchor>
              </Stack>
            </Stack>

            <Stack gap="xs">
              <Text fw={500}>Resources</Text>
              <Stack gap={8}>
                <Anchor href="#docs" c="dimmed" size="sm">Documentation</Anchor>
                <Anchor href="#help" c="dimmed" size="sm">Help Center</Anchor>
                <Anchor href="#contact" c="dimmed" size="sm">Contact</Anchor>
              </Stack>
            </Stack>
          </Group>
        </Group>

        <Group justify="space-between" align="center" pt="xl" mt="xl" style={{ borderTop: '1px solid #eee' }}>
          <Text size="sm" c="dimmed">© 2025 GauntletCRM. All rights reserved.</Text>
          <Group gap="md">
            <Anchor href="#privacy" size="sm" c="dimmed">Privacy</Anchor>
            <Anchor href="#terms" size="sm" c="dimmed">Terms</Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}

export function HomePage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <AppShell header={{ height: 60 }} padding={0} style={{ position: 'relative', background: 'transparent' }}>
      <WaveBackground />
      <Navbar onGetStarted={onGetStarted} />
      
      <Container size="lg" py={120} mt={60} style={{ position: 'relative', zIndex: 1 }}>
        <Stack gap={80}>
          {/* Hero Section */}
          <Stack gap="xl" align="center" ta="center" pt={75}>
            <Title order={1} size="7.5rem" maw={800} className={styles.gradientText}>
              GauntletCRM
            </Title>
            <Text size="xl" c="dimmed" maw={600}>
              A modern, efficient customer relationship management system designed to streamline your support workflow.
            </Text>
            <Group gap="md">
              <Button size="lg" onClick={onGetStarted}>
                Get Started
              </Button>
              <Button size="lg" variant="light" component="a" href="#demo">
                Watch Demo
              </Button>
            </Group>
          </Stack>

          {/* Features Section */}
          <Stack gap="xl" align="center" id="features">
            <Title order={2}>Why Choose GauntletCRM?</Title>
            <Group grow wrap="wrap" style={{ maxWidth: '100%' }}>
              {[
                { title: 'Real-time Updates', description: 'Stay in sync with your team through live ticket updates and notifications.' },
                { title: 'Smart Workflows', description: 'Automate routine tasks and focus on what matters most - your customers.' },
                { title: 'Powerful Analytics', description: 'Make data-driven decisions with comprehensive reporting and insights.' }
              ].map((feature) => (
                <Box key={feature.title} p="xl" style={{ flex: '1 1 300px' }}>
                  <Stack gap="md">
                    <Title order={3}>{feature.title}</Title>
                    <Text c="dimmed">{feature.description}</Text>
                  </Stack>
                </Box>
              ))}
            </Group>
          </Stack>
        </Stack>
      </Container>

      <Footer />
    </AppShell>
  )
} 