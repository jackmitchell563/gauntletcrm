import { Stack, Paper, Text, Group } from '@mantine/core';

interface ChatMessageProps {
  message: {
    content: string;
    role: 'user' | 'assistant' | 'system';
    created_at: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <Paper
      shadow="sm"
      p="xs"
      style={{
        backgroundColor: isUser ? '#f0f9ff' : 'white',
        marginLeft: isUser ? 'auto' : '0',
        marginRight: isUser ? '0' : 'auto',
        maxWidth: '80%',
      }}
    >
      <Stack gap="xs">
        <Group justify={isUser ? 'flex-end' : 'flex-start'}>
          <Text size="xs" c="dimmed">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </Text>
        </Group>
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      </Stack>
    </Paper>
  );
} 