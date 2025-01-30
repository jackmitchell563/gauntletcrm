import { useState, useEffect } from 'react';
import { Paper, Stack, Button, Group, ActionIcon, Transition, ScrollArea } from '@mantine/core';
import { IconMessage, IconX, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { ChatSession } from './ChatSession';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../supabaseClient';

interface ChatSession {
  id: string;
  created_at: string;
  is_active: boolean;
}

export function ChatBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 350, height: 500 });
  const [maxDimensions, setMaxDimensions] = useState({ 
    width: Math.floor(window.innerWidth * 0.9),
    height: Math.floor(window.innerHeight * 0.9)
  });
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      loadSessions();
      checkForWelcomeMessage();
    }
  }, [user]);
  
  useEffect(() => {
    const handleResize = () => {
      const newMaxWidth = Math.floor(window.innerWidth * 0.9);
      const newMaxHeight = Math.floor(window.innerHeight * 0.9);
      
      setMaxDimensions({ width: newMaxWidth, height: newMaxHeight });
      
      setDimensions(current => ({
        width: Math.min(current.width, newMaxWidth),
        height: Math.min(current.height, newMaxHeight)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setSessions(data || []);
      
      // Set first session as active if none is selected
      if (data?.length && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };
  
  const checkForWelcomeMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);
        
      if (error) throw error;
      
      if (!data?.length) {
        await createNewSession();
      }
    } catch (err) {
      console.error('Error checking welcome message:', err);
    }
  };
  
  const createNewSession = async () => {
    if (!user) return;
    
    try {
      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();
        
      if (sessionError) throw sessionError;
      
      // Always send welcome message for new sessions
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          content: "Welcome to GauntletCRM! I'm your AI assistant. Let me know what you'd like to do today!",
          role: 'assistant'
        });
        
      if (messageError) throw messageError;
      
      await loadSessions();
      setActiveSessionId(session?.id);
      setIsExpanded(true);
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };
  
  const closeSession = async (sessionId: string) => {
    try {
      // Delete the chat session and its messages
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);
        
      if (messagesError) throw messagesError;
      
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
        
      if (sessionError) throw sessionError;
        
      setSessions(current => current.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(sessions.find(s => s.id !== sessionId)?.id || null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };
  
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;
    
    const doDrag = (e: MouseEvent) => {
      const newWidth = Math.min(
        maxDimensions.width,
        Math.max(350, startWidth - (e.pageX - startX))
      );
      const newHeight = Math.min(
        maxDimensions.height,
        Math.max(400, startHeight - (e.pageY - startY))
      );
      setDimensions({ width: newWidth, height: newHeight });
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return (
    <Transition
      mounted={true}
      transition="slide-up"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Paper
          shadow="md"
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: isExpanded ? dimensions.width : 60,
            height: isExpanded ? dimensions.height : 60,
            transition: isExpanded ? 'none' : 'all 0.3s ease',
            zIndex: 1000,
            ...styles,
          }}
        >
          {isExpanded ? (
            <Stack h="100%" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '20px',
                  height: '20px',
                  cursor: 'nw-resize',
                  zIndex: 1001,
                }}
                onMouseDown={startResize}
              >
                <IconGripVertical
                  size={16}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    opacity: 0.5,
                  }}
                />
              </div>
              
              <Group p="xs" style={{ borderBottom: '1px solid #eee' }}>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => createNewSession()}
                >
                  New Chat
                </Button>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setIsExpanded(false)}
                  ml="auto"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>

              {sessions.length > 1 && (
                <ScrollArea h={70} p="xs">
                  <Group gap="xs" wrap="nowrap">
                    {sessions.map((session) => (
                      <Button
                        key={session.id}
                        variant={session.id === activeSessionId ? "filled" : "light"}
                        size="compact-sm"
                        rightSection={
                          <ActionIcon
                            variant="transparent"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent button click
                              closeSession(session.id);
                            }}
                            style={{ color: 'inherit' }}
                          >
                            <IconX size={12} />
                          </ActionIcon>
                        }
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        Chat {sessions.indexOf(session) + 1}
                      </Button>
                    ))}
                  </Group>
                </ScrollArea>
              )}
              
              {activeSessionId && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <ChatSession
                    sessionId={activeSessionId}
                    onClose={() => closeSession(activeSessionId)}
                  />
                </div>
              )}
            </Stack>
          ) : (
            <ActionIcon
              variant="filled"
              size="xl"
              radius="xl"
              onClick={() => setIsExpanded(true)}
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
              }}
            >
              <IconMessage size={24} />
            </ActionIcon>
          )}
        </Paper>
      )}
    </Transition>
  );
} 