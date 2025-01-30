import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ChatOpenAI } from "npm:@langchain/openai"
import { AgentExecutor, createOpenAIFunctionsAgent } from "npm:langchain/agents"
import { DynamicStructuredTool } from "npm:@langchain/core/tools"
import { ChatPromptTemplate, MessagesPlaceholder } from "npm:@langchain/core/prompts"

// Helper function to parse advanced search queries
function parseAdvancedQuery(query: string) {
  const orParts = query.split(/\s+OR\s+/);
  return orParts.map(part => {
    const terms = part.trim()
      .split(/\s+/)
      .filter(term => term && term !== 'AND')
      .map(term => term.replace(/['"]/g, ''));
    return terms;
  });
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  console.log("[agent-executor] Received request")
  try {
    const { input, chat_history } = await req.json()
    console.log("[agent-executor] Request payload:", { input, chatHistoryLength: chat_history?.length })
    
    // Get auth context
    console.log("[agent-executor] Initializing Supabase client")
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    console.log("[agent-executor] Supabase client initialized")

    // Role checking helper
    async function checkUserRole(requiredRoles: string[]): Promise<boolean> {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) return false;

      const { data: profile, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) return false;
      return requiredRoles.includes(profile.role);
    }
    
    // Initialize tools with supabase client
    console.log("[agent-executor] Initializing tools")
    const tools = [
      // Ticket Tools
      new DynamicStructuredTool({
        name: "create_ticket",
        description: "Creates a new support ticket. Input should be a JSON string with {title: string, description: string, priority?: string, customer_id?: string}",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", optional: true },
            customer_id: { type: "string", optional: true }
          },
          required: ["title", "description"]
        },
        func: async (params) => {
          const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
          if (authError) throw new Error(`Auth error: ${authError.message}`);
          if (!user) throw new Error('No authenticated user found');

          const { data, error } = await supabaseClient
            .from('tickets')
            .insert([{
              title: params.title,
              description: params.description,
              priority: params.priority || 'medium',
              status: 'open',
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (error) throw new Error(`Failed to create ticket: ${error.message}`);
          return JSON.stringify(data);
        }
      }),

      new DynamicStructuredTool({
        name: "update_ticket",
        description: "Updates an existing ticket's properties. Input should be a JSON string with {ticket_id: string, updates: object}. Requires agent or admin role.",
        schema: {
          type: "object",
          properties: {
            ticket_id: { type: "string" },
            updates: { 
              type: "object",
              properties: {
                title: { type: "string", optional: true },
                description: { type: "string", optional: true },
                status: { type: "string", optional: true },
                priority: { type: "string", optional: true },
                assigned_to: { type: "string", optional: true }
              }
            }
          },
          required: ["ticket_id", "updates"]
        },
        func: async (params) => {
          if (!await checkUserRole(['admin', 'agent'])) {
            throw new Error('Permission denied: Requires agent or admin role');
          }

          const { data, error } = await supabaseClient
            .from('tickets')
            .update(params.updates)
            .eq('id', params.ticket_id)
            .select()
            .single();
          
          if (error) throw error;
          return JSON.stringify(data);
        }
      }),

      new DynamicStructuredTool({
        name: "search_tickets",
        description: "Searches tickets with advanced filtering. Supports simple and advanced search modes.",
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            search_type: { type: "string", enum: ["simple", "advanced"], optional: true },
            status: { type: "array", items: { type: "string" }, optional: true },
            priority: { type: "array", items: { type: "string" }, optional: true },
            assigned_to: { type: "string", optional: true },
            tags: { type: "array", items: { type: "string" }, optional: true }
          },
          required: ["query"]
        },
        func: async (params) => {
          const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
          if (authError || !user) throw new Error('Authentication required');

          const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          let query = supabaseClient
            .from('tickets')
            .select('*, ticket_tags(tag)');
            
          if (profile?.role === 'customer') {
            query = query.eq('created_by', user.id);
          }

          if (params.query) {
            const isAdvancedSearch = params.search_type === 'advanced' || params.query.includes(' OR ');
            
            if (isAdvancedSearch) {
              const searchConditions = parseAdvancedQuery(params.query);
              const orConditions = searchConditions.map(andTerms => {
                const andConditions = andTerms.map(term => {
                  const escapedTerm = term.replace(/'/g, "''");
                  return `title.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`;
                });
                return andConditions.join(' and ');
              });
              if (orConditions.length > 0) {
                query = query.or(orConditions.join(','));
              }
            } else {
              const terms = params.query.trim().split(/\s+/);
              const andConditions = terms.map(term => {
                const escapedTerm = term.replace(/'/g, "''");
                return `title.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`;
              });
              query = query.or(andConditions.join(' and '));
            }
          }

          const { data: tickets, error: ticketsError } = await query;
          if (ticketsError) throw new Error(`Failed to search tickets: ${ticketsError.message}`);
          return JSON.stringify(tickets || []);
        }
      })
    ];
    console.log("[agent-executor] Tools initialized:", tools.map(t => t.name))

    console.log("[agent-executor] Initializing ChatOpenAI model")
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: 'gpt-4o-mini',
      openAIApiKey: Deno.env.get('OPENAI_API_KEY')
    })
    console.log("[agent-executor] Model initialized")

    console.log("[agent-executor] Setting up prompt template")
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a helpful AI assistant for GauntletCRM, a customer relationship management system.
      Your role is to help users manage tickets, customer information, and system operations.
      Always be professional, courteous, and precise in your responses.
      If you need to perform any actions, use the appropriate tools available to you.
      If you encounter any errors, explain them clearly to the user and suggest alternative actions.

      IMPORTANT FORMATTING INSTRUCTIONS:
      - Format your responses using HTML tags for rich text
      - Use <p> for paragraphs
      - Use <strong> for bold text
      - Use <em> for italic text
      - Use <code> for code or technical terms
      - Use <ul> and <li> for bullet points
      - Use <ol> and <li> for numbered lists
      - Use <a href="..."> for links
      - When users send messages, they will be in rich text format, so ignore any HTML tags in their messages and treat them as plain text
      `],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ])
    console.log("[agent-executor] Prompt template created")

    console.log("[agent-executor] Creating OpenAI Functions agent")
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt
    })
    console.log("[agent-executor] Agent created successfully")

    console.log("[agent-executor] Setting up agent executor")
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true
    })
    console.log("[agent-executor] Agent executor ready")

    console.log("[agent-executor] Invoking agent with input")
    const result = await agentExecutor.invoke({
      input,
      chat_history
    })
    console.log("[agent-executor] Agent execution completed:", { result })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("[agent-executor] Error occurred:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})