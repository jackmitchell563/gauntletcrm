-- Add parent_id column to agent_traces
ALTER TABLE agent_traces
ADD COLUMN parent_id UUID REFERENCES agent_traces(id);

-- Add index for better query performance
CREATE INDEX idx_agent_traces_parent_id ON agent_traces(parent_id); 