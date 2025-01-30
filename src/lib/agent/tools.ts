import { supabase } from '../../supabaseClient';
import { DynamicTool } from '@langchain/core/tools';
import { Ticket, UserProfile } from '../../types/database.types';

// Role types
type UserRole = 'admin' | 'agent' | 'customer';

// Role checking helper
async function checkUserRole(requiredRoles: UserRole[]): Promise<boolean> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return false;
  return requiredRoles.includes(profile.role as UserRole);
}

// Base tool interface
export interface Tool {
  name: string;
  description: string;
  func: (input: string) => Promise<any>;
}

// Tool categories interface
export interface ToolSet {
  ticketTools: Tool[];
  customerTools: Tool[];
  systemTools: Tool[];
}

// Input type definitions
interface CreateTicketInput {
  title: string;
  description: string;
  priority?: string;
  customer_id?: string;
}

interface UpdateTicketInput {
  ticket_id: string;
  updates: Partial<Ticket>;
}

interface SearchTicketsInput {
  query: string;
  status?: string[];
  priority?: string[];
  assigned_to?: string;
  search_type?: 'simple' | 'advanced';
  created_after?: string;
  created_before?: string;
  last_updated_before?: string;
  last_updated_after?: string;
  tags?: string[];
  customer_name?: string;
  // Response tracking
  has_customer_response?: boolean;
  days_since_response?: number;
  min_responses?: number;
  max_responses?: number;
}

interface UpdateCustomerInput {
  customer_id: string;
  updates: Partial<UserProfile>;
}

// Helper function to parse advanced search queries
function parseAdvancedQuery(query: string) {
  // Split by OR first
  const orParts = query.split(/\s+OR\s+/);
  
  // For each OR part, split by spaces to get AND conditions
  return orParts.map(part => {
    const terms = part.trim()
      .split(/\s+/)
      .filter(term => term && term !== 'AND')
      .map(term => term.replace(/['"]/g, '')); // Remove quotes
    return terms;
  });
}

// Ticket Management Tools
export const ticketTools = [
  new DynamicTool({
    name: "create_ticket",
    description: "Creates a new support ticket. Input should be a JSON string with {title: string, description: string, priority?: string, customer_id?: string}",
    func: async (input: string) => {
      const params = JSON.parse(input) as CreateTicketInput;
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!user) throw new Error('No authenticated user found');

      // All roles can create tickets
      const { data, error } = await supabase
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
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to create ticket: ${error.message}`);
      }

      return {
        name: "create_ticket",
        content: JSON.stringify(data)
      };
    }
  }),
  
  new DynamicTool({
    name: "update_ticket",
    description: "Updates an existing ticket's properties. Input should be a JSON string with {ticket_id: string, updates: object}. Requires agent or admin role.",
    func: async (input: string) => {
      // Check if user has permission
      if (!await checkUserRole(['admin', 'agent'])) {
        throw new Error('Permission denied: Requires agent or admin role');
      }

      const params = JSON.parse(input) as UpdateTicketInput;
      const { data, error } = await supabase
        .from('tickets')
        .update(params.updates)
        .eq('id', params.ticket_id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        name: "update_ticket",
        content: JSON.stringify(data)
      };
    }
  }),
  
  new DynamicTool({
    name: "search_tickets",
    description: `Searches tickets with advanced filtering. Input JSON:
{
  "query": string,         // Search in title/description
  "search_type"?: "simple" | "advanced",  // Use "advanced" for OR operator
  "status"?: string[],     // Filter by status
  "priority"?: string[],   // Filter by priority
  "assigned_to"?: string,  // Filter by assignee
  "tags"?: string[],       // Filter by tags
  "created_after"?: string,   // ISO date
  "created_before"?: string,  // ISO date
  "last_updated_after"?: string,
  "last_updated_before"?: string,
  "customer_name"?: string,
  "has_customer_response"?: boolean,
  "days_since_response"?: number
}

Examples:
- Simple: {"query": "login issue"}
- Advanced: {"query": "urgent OR high-priority"}
- Combined: {"tags": ["bug"], "priority": ["high"]}
- Date: {"created_after": "2024-01-01"}

Case-insensitive. Advanced mode supports OR operator and space-separated AND terms.`,
    func: async (input: string) => {
      const params = JSON.parse(input) as SearchTicketsInput;
      
      // Get current user and role
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags (
            tag
          )
        `);
        
      // Apply role-based filters
      if (profile?.role === 'customer') {
        // Customers can only see their own tickets
        query = query.eq('created_by', user.id);
      }

      // Apply text search based on search type
      if (params.query) {
        // Auto-detect advanced search if query contains OR
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
          // Split query into terms for AND logic
          const terms = params.query.trim().split(/\s+/);
          const andConditions = terms.map(term => {
            const escapedTerm = term.replace(/'/g, "''");
            return `title.ilike.%${escapedTerm}%,description.ilike.%${escapedTerm}%`;
          });
          // Combine conditions with AND logic
          query = query.or(andConditions.join(' and '));
        }
      }

      // Get the tickets first
      const { data: tickets, error: ticketsError } = await query;
      
      if (ticketsError) {
        console.error('Search error:', ticketsError);
        throw new Error(`Failed to search tickets: ${ticketsError.message}`);
      }

      if (tickets && tickets.length > 0) {
        // Get unique creator IDs
        const creatorIds = [...new Set(tickets.map(ticket => ticket.created_by))];

        // Fetch user profiles separately
        const { data: creators, error: creatorsError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        if (creatorsError) {
          console.error('Creator fetch error:', creatorsError);
          throw new Error(`Failed to fetch creator information: ${creatorsError.message}`);
        }

        // Create a map of creator IDs to user info
        const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

        // Fetch ticket responses if needed
        let ticketResponses = null;
        if (params.has_customer_response !== undefined || params.days_since_response) {
          const { data: responses, error: responsesError } = await supabase
            .from('ticket_responses')
            .select('ticket_id, created_at, is_customer_response')
            .in('ticket_id', tickets.map(t => t.id));

          if (responsesError) {
            console.error('Responses fetch error:', responsesError);
            throw new Error(`Failed to fetch response information: ${responsesError.message}`);
          }
          ticketResponses = responses;
        }

        // Filter tickets based on responses if needed
        let filteredTickets = tickets;
        if (ticketResponses) {
          const responseMap = new Map();
          ticketResponses.forEach(response => {
            if (!responseMap.has(response.ticket_id)) {
              responseMap.set(response.ticket_id, []);
            }
            responseMap.get(response.ticket_id).push(response);
          });

          if (params.has_customer_response !== undefined) {
            filteredTickets = filteredTickets.filter(ticket => {
              const responses = responseMap.get(ticket.id) || [];
              return params.has_customer_response === 
                responses.some((r: { is_customer_response: boolean }) => r.is_customer_response);
            });
          }

          if (params.days_since_response) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - params.days_since_response);
            filteredTickets = filteredTickets.filter(ticket => {
              const responses = responseMap.get(ticket.id) || [];
              const lastResponse = responses.sort((a: { created_at: string }, b: { created_at: string }) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              return lastResponse && new Date(lastResponse.created_at) < cutoffDate;
            });
          }
        }

        // Combine all data
        const ticketsWithDetails = filteredTickets.map(ticket => ({
          ...ticket,
          creator_name: creatorMap.get(ticket.created_by)?.full_name || 'Unknown'
        }));

        // Apply customer name filter if specified
        if (params.customer_name) {
          return {
            name: "search_tickets",
            content: JSON.stringify({
              message: `Found ${ticketsWithDetails.length} ticket(s)`,
              results: ticketsWithDetails.filter(ticket => 
                ticket.creator_name.toLowerCase().includes(params.customer_name!.toLowerCase())
              )
            })
          };
        }

        return {
          name: "search_tickets",
          content: JSON.stringify({
            message: `Found ${ticketsWithDetails.length} ticket(s)`,
            results: ticketsWithDetails
          })
        };
      }

      // If no results found, provide a helpful message
      return {
        name: "search_tickets",
        content: JSON.stringify({
          message: `No tickets found matching: ${params.query}. Try adjusting your search terms.`,
          results: []
        })
      };
    }
  })
];

// Customer Management Tools
export const customerTools = [
  new DynamicTool({
    name: "get_customer_info",
    description: "Retrieves detailed customer information. Input should be a JSON string with {customer_id: string}. Requires agent or admin role.",
    func: async (input: string) => {
      // Check if user has permission
      if (!await checkUserRole(['admin', 'agent'])) {
        throw new Error('Permission denied: Requires agent or admin role');
      }

      const params = JSON.parse(input) as { customer_id: string };
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          tickets (
            id,
            title,
            status,
            priority,
            created_at
          )
        `)
        .eq('id', params.customer_id)
        .single();
      
      if (error) throw error;
      return {
        name: "get_customer_info",
        content: JSON.stringify(data)
      };
    }
  }),
  
  new DynamicTool({
    name: "update_customer",
    description: "Updates customer information. Input should be a JSON string with {customer_id: string, updates: object}. Requires admin role.",
    func: async (input: string) => {
      // Check if user has permission
      if (!await checkUserRole(['admin'])) {
        throw new Error('Permission denied: Requires admin role');
      }

      const params = JSON.parse(input) as UpdateCustomerInput;
      const { data, error } = await supabase
        .from('user_profiles')
        .update(params.updates)
        .eq('id', params.customer_id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        name: "update_customer",
        content: JSON.stringify(data)
      };
    }
  })
];

// System Tools
export const systemTools = [
  new DynamicTool({
    name: "system_status",
    description: "Checks system status and performance metrics. Requires agent or admin role.",
    func: async (_input: string) => {
      // Check if user has permission
      if (!await checkUserRole(['admin', 'agent'])) {
        throw new Error('Permission denied: Requires agent or admin role');
      }

      const { data, error } = await supabase
        .rpc('get_system_status');
      
      if (error) throw error;
      return {
        name: "system_status",
        content: JSON.stringify(data)
      };
    }
  })
];

// Export all tools as a set
export const toolSet: ToolSet = {
  ticketTools,
  customerTools,
  systemTools
}; 