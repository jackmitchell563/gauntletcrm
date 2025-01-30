import { useState, useEffect, useRef } from 'react'
import { Stack, Group, Button, Text, Paper, Box, Rating } from '@mantine/core'
import { RichTextEditor, Link } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { IconMoodSmile } from '@tabler/icons-react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { StatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { generateTicketResponse } from '../features/outreach/agents/OutreachAgent'

function AngleBracket() {
  return (
    <Box style={{ position: 'relative', width: '12px', height: '16px', display: 'flex', alignItems: 'center' }}>
      <Box
        style={{
          position: 'absolute',
          width: '2px',
          height: '8px',
          backgroundColor: 'currentColor',
          transform: 'rotate(45deg)',
          transformOrigin: 'center',
          left: '2px',
          top: '2px'
        }}
      />
      <Box
        style={{
          position: 'absolute',
          width: '2px',
          height: '8px',
          backgroundColor: 'currentColor',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
          left: '2px',
          bottom: '2px'
        }}
      />
    </Box>
  )
}

interface TicketComment {
  id: string
  content: string
  created_at: string
  user_id: string
  is_internal: boolean
  user_profiles: {
    full_name: string
    role: string
  }
}

interface TicketThreadProps {
  ticketId: string
  ticket: {
    title: string
    status: any
    priority: any
    description: string | null
    created_by: string
    created_at: string
    assigned_to: string | null
  }
  onBack: () => void
}

export function TicketThread({ ticketId, ticket, onBack }: TicketThreadProps) {
  const [comments, setComments] = useState<TicketComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null)
  const [existingRating, setExistingRating] = useState<number | null>(null)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [author, setAuthor] = useState<{ full_name: string; role: string } | null>(null)
  const [assignedAgent, setAssignedAgent] = useState<{ full_name: string } | null>(null)
  const { userProfile, user } = useAuth()
  const isAgent = userProfile?.role === 'agent' || userProfile?.role === 'admin'
  const isCustomer = userProfile?.role === 'customer'
  const isClosedOrResolved = ticket.status === 'resolved' || ticket.status === 'closed'
  const canComment = isAgent || !isClosedOrResolved
  const showRating = isCustomer && isClosedOrResolved
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>('')
  const [initialDraft, setInitialDraft] = useState<string>('')

  const savePendingDraft = async () => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
      pendingSaveRef.current = null;
      // Save any pending changes
      if (lastContentRef.current !== newComment) {
        await saveDraft(lastContentRef.current);
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: true,
          HTMLAttributes: {
            class: 'my-hard-break'
          }
        }
      }),
      Underline,
      Link,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: canComment ? "Type your message..." : "This ticket is closed. No new messages can be added."
      })
    ],
    content: initialDraft || newComment,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setNewComment(content);
      lastContentRef.current = content;
      
      // Clear any pending save
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
      }
      
      // Set new pending save
      pendingSaveRef.current = setTimeout(() => {
        saveDraft(content);
        pendingSaveRef.current = null;
      }, 500);
    },
    editable: !(submitting || !canComment),
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (!submitting && canComment && editor?.getHTML().trim()) {
            handleSubmit();
          }
          return true;
        }
        return false;
      }
    }
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      savePendingDraft();
    };
  }, []);

  // Update back button and any other navigation handlers
  const handleNavigation = async (callback: () => void) => {
    await savePendingDraft();
    callback();
  };

  useEffect(() => {
    fetchComments()
    fetchAuthor()
    fetchDraft()
    if (ticket.assigned_to) {
      fetchAssignedAgent()
    }
    if (showRating) {
      fetchExistingRating()
    }

    const commentsChannel = supabase
      .channel('ticket_comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    const draftsChannel = supabase
      .channel('ticket_drafts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_drafts',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          // Only update if it's not our own change
          if ((payload.new as { user_id: string }).user_id !== user?.id) {
            fetchDraft()
          }
        }
      )
      .subscribe()

    return () => {
      commentsChannel.unsubscribe()
      draftsChannel.unsubscribe()
    }
  }, [ticketId, showRating, ticket.assigned_to])

  const fetchAuthor = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', ticket.created_by)
        .single()

      if (error) throw error
      setAuthor(data)
    } catch (err) {
      console.error('Error fetching author:', err)
    }
  }

  const fetchAssignedAgent = async () => {
    if (!ticket.assigned_to) return
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', ticket.assigned_to)
        .single()

      if (error) throw error
      setAssignedAgent(data)
    } catch (err) {
      console.error('Error fetching assigned agent:', err)
    }
  }

  const fetchExistingRating = async () => {
    try {
      const { data, error } = await supabase
        .from('satisfaction_ratings')
        .select('score')
        .eq('ticket_id', ticketId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
      
      if (data) {
        setExistingRating(data.score)
        setSatisfactionRating(data.score)
      }
    } catch (err) {
      console.error('Error fetching satisfaction rating:', err)
    }
  }

  const fetchDraft = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('ticket_drafts')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setDraftId(data.id);
        setInitialDraft(data.content);
        if (editor) {
          editor.commands.setContent(data.content);
        }
      }
    } catch (err) {
      console.error('Error fetching draft:', err)
    }
  }

  const saveDraft = async (content: string) => {
    if (!user || draftSaving) return;
    
    setDraftSaving(true)
    try {
      // Use upsert instead of separate insert/update
      const { data, error } = await supabase
        .from('ticket_drafts')
        .upsert({
          ticket_id: ticketId,
          user_id: user.id,
          content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ticket_id,user_id'
        })
        .select()
        .single()

      if (error) throw error;
      if (data) setDraftId(data.id)
    } catch (err) {
      console.error('Error saving draft:', err)
    } finally {
      setDraftSaving(false)
    }
  }

  const deleteDraft = async () => {
    if (!draftId) return;
    
    try {
      await supabase
        .from('ticket_drafts')
        .delete()
        .eq('id', draftId)
      
      setDraftId(null)
    } catch (err) {
      console.error('Error deleting draft:', err)
    }
  }

  const handleRatingSubmit = async (value: number) => {
    if (ratingSubmitting) return
    setRatingSubmitting(true)

    try {
      // Update both score and user_id
      const { error } = await supabase
        .from('satisfaction_ratings')
        .update({ 
          score: value,
          user_id: user?.id 
        })
        .eq('ticket_id', ticketId)

      if (error) throw error
      
      setExistingRating(value)
      setSatisfactionRating(value)
    } catch (err) {
      console.error('Error submitting rating:', err)
    } finally {
      setRatingSubmitting(false)
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select(`
          *,
          user_profiles(
            full_name,
            role
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error
      console.log('Fetched comments:', data) // Add logging to debug
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!editor?.getHTML().trim() || submitting || !canComment) return

    setSubmitting(true)
    try {
      await savePendingDraft(); // Ensure any pending draft is saved first
      
      const { error } = await supabase.functions.invoke('handle-ticket-comment', {
        body: {
          ticket_id: ticketId,
          content: editor.getHTML().trim(),
          is_internal: false
        }
      })

      if (error) throw error
      
      await deleteDraft()
      editor.commands.setContent('')
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group>
          <Button 
            variant="subtle" 
            leftSection={<AngleBracket />}
            onClick={async () => {
              await handleNavigation(() => onBack());
            }}
          >
            Back to Dashboard
          </Button>
          <Text size="xl" fw={600}>{ticket.title}</Text>
        </Group>
        <Group>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </Group>
      </Group>

      <Paper withBorder p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Group>
              <Text size="sm" c="dimmed">Created by:</Text>
              <Text size="sm" fw={500}>{author?.full_name || 'Unknown'} ({author?.role || 'Unknown'})</Text>
              <Text size="sm" c="dimmed">on</Text>
              <Text size="sm">{new Date(ticket.created_at).toLocaleString()}</Text>
            </Group>
            <Group>
              <Text size="sm" c="dimmed">Assigned to:</Text>
              <Text size="sm" fw={500}>{assignedAgent?.full_name || 'Not yet assigned'}</Text>
            </Group>
          </Group>
          {ticket.description && (
            <>
              <Text size="sm" fw={500}>Description:</Text>
              <Text>{ticket.description}</Text>
            </>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          {loading ? (
            <Text ta="center">Loading comments...</Text>
          ) : comments.length === 0 ? (
            <Text ta="center" c="dimmed">No comments yet</Text>
          ) : (
            comments.map((comment) => (
              <Paper 
                key={comment.id} 
                shadow="xs" 
                p="md"
                style={{
                  backgroundColor: comment.user_id === userProfile?.id ? '#f0f9ff' : 'white'
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {comment.user_profiles?.full_name || 'Unknown'} ({comment.user_profiles?.role || 'Unknown'})
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(comment.created_at).toLocaleString()}
                    </Text>
                  </Group>
                  <div dangerouslySetInnerHTML={{ __html: comment.content }} />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Stack gap="md">
        <Paper withBorder p="md">
          <Stack gap="md">
            <RichTextEditor editor={editor} style={{ 
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <RichTextEditor.Toolbar sticky stickyOffset={60}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.Underline />
                  <RichTextEditor.Strikethrough />
                  <RichTextEditor.ClearFormatting />
                  <RichTextEditor.Code />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.H1 />
                  <RichTextEditor.H2 />
                  <RichTextEditor.H3 />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Blockquote />
                  <RichTextEditor.Hr />
                  <RichTextEditor.BulletList />
                  <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.AlignLeft />
                  <RichTextEditor.AlignCenter />
                  <RichTextEditor.AlignJustify />
                  <RichTextEditor.AlignRight />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Link />
                  <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>

              <RichTextEditor.Content style={{ 
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                '& .ProseMirror': { 
                  flex: 1,
                  minHeight: '150px'
                } 
              }} />
            </RichTextEditor>
            <Group justify="space-between">
              {isAgent && (
                <Button 
                  variant="light"
                  loading={draftSaving}
                  onClick={async () => {
                    try {
                      setDraftSaving(true);
                      const draftResponse = await generateTicketResponse(
                        {
                          ...ticket,
                          id: ticketId
                        },
                        author?.full_name || 'Valued Customer',
                        userProfile?.full_name || 'Support Agent'
                      );
                      
                      await supabase
                        .from('ticket_drafts')
                        .upsert({
                          ticket_id: ticketId,
                          user_id: user?.id,
                          content: draftResponse
                        }, {
                          onConflict: 'ticket_id,user_id'
                        });

                      // Set the editor content to the generated response
                      editor?.commands.setContent(draftResponse);
                    } catch (err) {
                      console.error('Error generating response:', err);
                    } finally {
                      setDraftSaving(false);
                    }
                  }}
                >
                  Generate AI Response
                </Button>
              )}
              <Button 
                onClick={handleSubmit}
                loading={submitting}
                disabled={!canComment}
              >
                Send Message
              </Button>
            </Group>
          </Stack>
        </Paper>

        {showRating && (
          <Paper withBorder p="md">
            <Stack gap="md" align="center">
              <Group gap="xs" align="center">
                <IconMoodSmile size={24} style={{ color: 'var(--mantine-color-green-6)' }} />
                <Text fw={500}>How satisfied were you with the resolution?</Text>
              </Group>
              
              <Rating
                value={satisfactionRating || 0}
                onChange={handleRatingSubmit}
                count={5}
                size="xl"
                readOnly={ratingSubmitting}
              />
              
              {existingRating && (
                <Text size="sm" c="dimmed">
                  Thank you for your feedback!
                </Text>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Stack>
  )
} 