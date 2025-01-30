import { useState, useEffect } from 'react';
import { Container, Title, Paper, Accordion, Text, Group, Badge, Loader, Stack } from '@mantine/core';
import { Client } from 'langsmith';
import { useAuth } from '../auth/AuthContext';

interface Trace {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  inputs: any;
  outputs: any;
  error?: string;
}

export function AgentHistoryPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        const client = new Client({
          apiKey: import.meta.env.VITE_LANGSMITH_API_KEY
        });

        // Fetch traces for the current project
        const runs: Trace[] = [];
        for await (const run of client.listRuns({
          projectName: "default",
          filter: userProfile?.role === 'customer' 
            ? `metadata.userId = '${userProfile.id}'`
            : undefined
        })) {
          runs.push({
            id: run.id,
            name: run.name || 'Unnamed Run',
            start_time: run.start_time?.toString() || new Date().toISOString(),
            end_time: run.end_time?.toString() || new Date().toISOString(),
            status: run.status || 'unknown',
            inputs: run.inputs,
            outputs: run.outputs,
            error: run.error
          });
          if (runs.length >= 50) break; // Limit to last 50 traces
        }

        setTraces(runs);
      } catch (error) {
        console.error('Error fetching traces:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTraces();
  }, [userProfile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'running':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Container size="xl" p="md">
        <Stack align="center" mt="xl">
          <Loader size="lg" />
          <Text>Loading agent history...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" p="md">
      <Title order={2} mb="lg">AI Agent History</Title>
      
      <Accordion>
        {traces.map((trace) => (
          <Accordion.Item key={trace.id} value={trace.id}>
            <Accordion.Control>
              <Group justify="space-between">
                <Text fw={500}>{trace.name}</Text>
                <Group gap="sm">
                  <Badge color={getStatusColor(trace.status)}>
                    {trace.status}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {formatDate(trace.start_time)}
                  </Text>
                </Group>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <Paper withBorder p="sm">
                  <Text fw={500} mb="xs">Input:</Text>
                  <Text component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(trace.inputs, null, 2)}
                  </Text>
                </Paper>

                <Paper withBorder p="sm">
                  <Text fw={500} mb="xs">Output:</Text>
                  <Text component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(trace.outputs, null, 2)}
                  </Text>
                </Paper>

                {trace.error && (
                  <Paper withBorder p="sm" bg="red.0">
                    <Text fw={500} mb="xs" c="red">Error:</Text>
                    <Text c="red">{trace.error}</Text>
                  </Paper>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {traces.length === 0 && (
        <Text c="dimmed" ta="center" mt="xl">
          No agent history found.
        </Text>
      )}
    </Container>
  );
} 