import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Comment {
  ticket_id: string
  content: string
  is_internal: boolean
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const body = await req.json()
    console.log('Received request body:', body)

    const { ticket_id, content, is_internal } = body
    if (!ticket_id || !content) {
      throw new Error('Missing required fields')
    }

    // Insert comment
    const { data, error } = await supabaseClient
      .from('ticket_comments')
      .insert([
        {
          ticket_id,
          content,
          user_id: user.id,
          is_internal: is_internal || false
        }
      ])
      .select('*')
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Successfully inserted comment:', data)

    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    )
  }
})