import { useState, useEffect } from 'react';
import { Container, Title, Paper, Accordion, Text, Group, Badge, Loader, Stack, Timeline, Box, Button } from '@mantine/core';
import { IconThumbUp, IconThumbDown } from '@tabler/icons-react';
import { Client, Run } from 'langsmith';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../supabaseClient';

interface Trace {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  inputs: any;
  outputs: any;
  error?: string;
  child_runs?: Trace[];
  rating?: {
    accurate_response: boolean;
  };
  metadata?: {
    userId?: string;
    [key: string]: any;
  };
}

interface Stats {
  totalRatings: number;
  accurateResponses: number;
  accuracyPercentage: number;
}

export function AgentHistoryPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({ totalRatings: 0, accurateResponses: 0, accuracyPercentage: 0 });
  const [initialized, setInitialized] = useState(false);
  const { userProfile } = useAuth();

  // Fetch ratings for traces
  const fetchRatings = async (traceIds: string[]) => {
    try {
      const { data: ratings, error } = await supabase
        .from('agent_trace_ratings')
        .select('*')
        .in('trace_id', traceIds)
        .eq('user_id', userProfile?.id);

      if (error) throw error;

      // Calculate stats
      const totalRatings = ratings.length;
      const accurateResponses = ratings.filter(r => r.accurate_response).length;
      const accuracyPercentage = totalRatings > 0 ? (accurateResponses / totalRatings) * 100 : 0;

      setStats({ totalRatings, accurateResponses, accuracyPercentage });

      // Update traces with ratings
      setTraces(prev => prev.map(trace => ({
        ...trace,
        rating: ratings.find(r => r.trace_id === trace.id)
      })));
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  // Handle rating a trace
  const handleRate = async (traceId: string, isAccurate: boolean) => {
    try {
      const { data: existingRating } = await supabase
        .from('agent_trace_ratings')
        .select('*')
        .eq('trace_id', traceId)
        .eq('user_id', userProfile?.id)
        .single();

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('agent_trace_ratings')
          .update({ accurate_response: isAccurate })
          .eq('id', existingRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('agent_trace_ratings')
          .insert({
            trace_id: traceId,
            user_id: userProfile?.id,
            accurate_response: isAccurate
          });

        if (error) throw error;
      }

      // Refresh ratings
      await fetchRatings(traces.map(t => t.id));
    } catch (error) {
      console.error('Error rating trace:', error);
    }
  };

  // Sync trace to Supabase
  const syncTraceToSupabase = async (trace: Trace, metadata: any, parentId?: string) => {
    try {
      // Skip if no userId in metadata
      if (!metadata?.userId) {
        console.log('Skipping trace sync - no userId in metadata:', {
          traceId: trace.id,
          metadata
        });
        return;
      }

      console.log('Syncing trace to Supabase:', {
        traceId: trace.id,
        metadataUserId: metadata?.userId,
        fallbackUserId: userProfile?.id,
        parentId
      });

      // Get authenticated client
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session found');
      }

      const { error } = await supabase
        .from('agent_traces')
        .upsert({
          id: trace.id,
          user_id: metadata.userId,  // No longer using fallback userId
          name: trace.name,
          start_time: trace.start_time,
          end_time: trace.end_time,
          status: trace.status,
          inputs: trace.inputs,
          outputs: trace.outputs,
          error: trace.error,
          parent_id: parentId
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error syncing trace:', {
          error,
          trace,
          metadata
        });
        throw error;
      }
    } catch (error) {
      console.error('Error in syncTraceToSupabase:', error);
    }
  };

  // Fetch child runs when a trace is expanded
  const fetchChildRuns = async (traceId: string) => {
    try {
      // Fetch child runs directly from LangSmith
      const client = new Client({
        apiKey: import.meta.env.VITE_LANGSMITH_API_KEY
      });

      const childRuns: Trace[] = [];
      const projectName = import.meta.env.VITE_LANGSMITH_PROJECT || 'gauntletcrm';
      for await (const run of client.listRuns({
        projectName,
        parentRunId: traceId
      }) as AsyncIterable<Run>) {
        childRuns.push({
          id: run.id,
          name: run.name || 'Unnamed Run',
          start_time: run.start_time?.toString() || new Date().toISOString(),
          end_time: run.end_time?.toString() || new Date().toISOString(),
          status: run.status || 'unknown',
          inputs: run.inputs,
          outputs: run.outputs,
          error: run.error
        });
      }

      // Update the parent trace with child runs
      setTraces(prev => prev.map(trace => 
        trace.id === traceId 
          ? { ...trace, child_runs: childRuns }
          : trace
      ));
    } catch (error) {
      console.error('Error fetching child runs:', error);
    }
  };

  // Add a new trace to the list
  const addTrace = async (trace: Trace) => {
    setTraces(prev => {
      const newTraces = [trace, ...prev];
      return newTraces.sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
    });
    await fetchRatings([trace.id]);
  };

  // Expose addTrace function globally for the agent to call
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addAgentTrace = addTrace;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addAgentTrace;
      }
    };
  }, []);

  // Initial load - only happens once when component mounts and user is logged in
  useEffect(() => {
    const fetchTraces = async () => {
      if (!userProfile?.id || initialized) return;

      try {
        setLoading(true);
        console.log('Starting initial trace fetch for user:', {
          userId: userProfile?.id,
          userRole: userProfile?.role
        });

        // 1. Fetch and sync all traces from LangSmith
        const client = new Client({
          apiKey: import.meta.env.VITE_LANGSMITH_API_KEY
        });

        let syncCount = 0;
        const projectName = import.meta.env.VITE_LANGSMITH_PROJECT || 'gauntletcrm';
        // Fetch all traces without filtering
        for await (const run of client.listRuns({
          projectName,
          isRoot: true
        }) as AsyncIterable<Run>) {
          // Skip sample traces
          if (run.name === 'Sample Agent Trace') continue;
          
          console.log('Processing LangSmith run:', {
            runId: run.id,
            metadata: run.extra?.metadata
          });
          
          // Sync to Supabase with metadata's userId
          await syncTraceToSupabase({
            id: run.id,
            name: run.name || 'Unnamed Run',
            start_time: run.start_time?.toString() || new Date().toISOString(),
            end_time: run.end_time?.toString() || new Date().toISOString(),
            status: run.status || 'unknown',
            inputs: run.inputs,
            outputs: run.outputs,
            error: run.error
          }, run.extra?.metadata);
          syncCount++;
        }

        console.log(`Synced ${syncCount} traces to Supabase`);

        // 2. Read from Supabase filtered by current user
        console.log('Reading traces from Supabase for user:', userProfile?.id);
        const { data: traces, error } = await supabase
          .from('agent_traces')
          .select('*')
          .eq('user_id', userProfile?.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        console.log(`Retrieved ${traces?.length || 0} traces from Supabase`);
        // Sort traces by start_time in descending order
        const sortedTraces = (traces || []).sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        setTraces(sortedTraces);
        
        // 3. Fetch ratings for traces
        if (traces?.length > 0) {
          await fetchRatings(traces.map(t => t.id));
        }

        setInitialized(true);
      } catch (error) {
        console.error('Error in fetchTraces:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTraces();
  }, [userProfile?.id]); // Only run when userProfile.id changes

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

//   const getStatusColor = (status: string) => {
//     switch (status.toLowerCase()) {
//       case 'completed':
//         return 'green';
//       case 'failed':
//         return 'red';
//       case 'running':
//         return 'blue';
//       default:
//         return 'green';
//     }
//   };

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
      
      {/* Accuracy Stats */}
      <Paper withBorder p="md" mb="lg">
        <Group justify="space-between" mb="xs">
          <Text fw={500}>Agent Accuracy</Text>
          <Text>{stats.accuracyPercentage.toFixed(1)}% ({stats.accurateResponses}/{stats.totalRatings} responses)</Text>
        </Group>
        <Box style={{ position: 'relative', height: '24px', background: '#f1f3f5', borderRadius: '4px', overflow: 'hidden' }}>
          <Box 
            style={{ 
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${stats.accuracyPercentage}%`,
              background: '#40c057',
              transition: 'width 0.3s ease'
            }} 
          />
          <Box 
            style={{ 
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: `${100 - stats.accuracyPercentage}%`,
              background: '#fa5252',
              transition: 'width 0.3s ease'
            }} 
          />
        </Box>
      </Paper>
      
      <Accordion 
        multiple 
        value={Array.from(expandedTraces)} 
        onChange={(value: string[]) => {
          setExpandedTraces(new Set(value));
          // Fetch child runs for newly expanded traces
          value.forEach(traceId => {
            const trace = traces.find(t => t.id === traceId);
            if (trace && !trace.child_runs) {
              fetchChildRuns(traceId);
            }
          });
        }}
      >
        {traces.map((trace) => (
          <Accordion.Item key={trace.id} value={trace.id}>
            <Accordion.Control>
              <Group justify="space-between">
                <Text fw={500}>{trace.name}</Text>
                <Group gap="sm">
                  <Button.Group>
                    <Button 
                      variant={trace.rating?.accurate_response === true ? "filled" : "default"}
                      size="xs" 
                      color={trace.rating?.accurate_response === true ? "green" : "gray"}
                      p={4}
                      styles={{
                        root: {
                          border: '1px solid #dee2e6',
                          '&:hover': {
                            border: '1px solid #dee2e6'
                          }
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRate(trace.id, true);
                      }}
                    >
                      <IconThumbUp size={16} />
                    </Button>
                    <Button 
                      variant={trace.rating?.accurate_response === false ? "filled" : "default"}
                      size="xs" 
                      color={trace.rating?.accurate_response === false ? "red" : "gray"}
                      p={4}
                      styles={{
                        root: {
                          border: '1px solid #dee2e6',
                          '&:hover': {
                            border: '1px solid #dee2e6'
                          }
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRate(trace.id, false);
                      }}
                    >
                      <IconThumbDown size={16} />
                    </Button>
                  </Button.Group>
                  <Text size="sm" c="dimmed">
                    {formatDate(trace.start_time)}
                  </Text>
                </Group>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                {trace.child_runs ? (
                  <Box mt="md">
                    <Text fw={500} mb="md">Execution Timeline:</Text>
                    <Timeline active={trace.child_runs.length - 1} bulletSize={24} lineWidth={2} color="blue">
                      {trace.child_runs.map((childRun, index) => (
                        <Timeline.Item key={childRun.id} bullet={
                          <Badge color="blue.9" size="xs" variant="filled" circle>
                            <Text c="white" size="xs">{trace.child_runs!.length - index}</Text>
                          </Badge>
                        }>
                          <Text fw={500} size="sm">{childRun.name}</Text>
                          <Text size="xs" c="dimmed">{formatDate(childRun.start_time)}</Text>
                          {childRun.outputs && (
                            <Paper withBorder p="xs" mt="xs">
                              <Text size="sm" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(childRun.outputs, null, 2)}
                              </Text>
                            </Paper>
                          )}
                          {childRun.error && (
                            <Text size="sm" c="red" mt="xs">{childRun.error}</Text>
                          )}
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </Box>
                ) : (
                  <Loader size="sm" />
                )}

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