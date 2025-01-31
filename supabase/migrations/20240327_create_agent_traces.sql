-- Create agent traces table
CREATE TABLE agent_traces (
    id UUID PRIMARY KEY,  -- This will match the LangSmith trace ID
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    inputs JSONB,
    outputs JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent trace ratings table
CREATE TABLE agent_trace_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id UUID REFERENCES agent_traces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    accurate_response BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trace_id, user_id)  -- One rating per trace per user
);

-- Enable RLS
ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trace_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for agent_traces
CREATE POLICY "Users can view their own traces"
    ON agent_traces FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND role IN ('admin', 'agent')
    ));

CREATE POLICY "Anyone can insert traces with any user_id"
    ON agent_traces FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update traces"
    ON agent_traces FOR UPDATE
    USING (true);

-- Policies for agent_trace_ratings
CREATE POLICY "Users can view all ratings"
    ON agent_trace_ratings FOR SELECT
    USING (true);

CREATE POLICY "Users can rate their own traces"
    ON agent_trace_ratings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_traces
            WHERE agent_traces.id = trace_id
            AND (
                agent_traces.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid()
                    AND role IN ('admin', 'agent')
                )
            )
        )
    );

CREATE POLICY "Users can update their own ratings"
    ON agent_trace_ratings FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own ratings"
    ON agent_trace_ratings FOR DELETE
    USING (user_id = auth.uid());

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE agent_traces;
ALTER publication supabase_realtime ADD TABLE agent_trace_ratings; 