-- Enable realtime for tickets table
alter publication supabase_realtime add table tickets;

-- Enable realtime for ticket_tags table since they're created together
alter publication supabase_realtime add table ticket_tags; 