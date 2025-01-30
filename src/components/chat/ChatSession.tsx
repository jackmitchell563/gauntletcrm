import { useState, useEffect } from 'react';
import { Stack, Button, Paper, ScrollArea } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { supabase } from '../../supabaseClient';
import { handleUserMessage } from '../../lib/agent';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  tool_calls?: any[];
  tool_outputs?: any[];
}

interface ChatSessionProps {
  sessionId: string;
  onClose: () => void;
}

export function ChatSession({ sessionId }: ChatSessionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link
    ],
    content: inputValue,
    onUpdate: ({ editor }) => {
      setInputValue(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      }
    }
  });

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [sessionId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages(current => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    setIsProcessing(true);
    const messageContent = inputValue.trim();
    setInputValue('');
    editor?.commands.setContent('');

    try {
      // Save user message
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          content: messageContent,
          role: 'user'
        });

      if (userMessageError) throw userMessageError;

      // Get chat history for context
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Process with AI agent
      await handleUserMessage(
        sessionId,
        messageContent,
        chatHistory
      );

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message to chat
      const { error: errorMessageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          content: "Sorry, there was an error processing your message. Please try again.",
          role: 'assistant'
        });

      if (errorMessageError) {
        console.error('Error saving error message:', errorMessageError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Stack h="100%" gap="xs">
      <ScrollArea h="calc(100% - 120px)" p="xs">
        <Stack gap="xs">
          {messages.map((message) => (
            <Paper
              key={message.id}
              p="xs"
              withBorder
              style={{
                backgroundColor: message.role === 'assistant' ? '#f8f9fa' : 'white',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: message.content }}
                style={{ fontSize: '14px' }}
              />
            </Paper>
          ))}
          {isProcessing && (
            <Paper
              p="xs"
              withBorder
              style={{
                backgroundColor: '#f8f9fa',
                alignSelf: 'flex-start',
                maxWidth: '80%'
              }}
            >
              <div style={{ fontSize: '14px', fontStyle: 'italic' }}>Thinking...</div>
            </Paper>
          )}
        </Stack>
      </ScrollArea>

      <Paper p="xs" withBorder>
        <RichTextEditor editor={editor}>
          <RichTextEditor.Toolbar sticky stickyOffset={0}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content />
        </RichTextEditor>

        <Button
          variant="light"
          size="sm"
          onClick={handleSend}
          disabled={isProcessing}
          style={{ marginTop: '8px', float: 'right' }}
        >
          <IconSend size={16} />
        </Button>
      </Paper>
    </Stack>
  );
} 