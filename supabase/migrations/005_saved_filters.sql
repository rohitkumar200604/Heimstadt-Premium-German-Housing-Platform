CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own saved filters" ON saved_filters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own saved filters" ON saved_filters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters" ON saved_filters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters" ON saved_filters
    FOR DELETE USING (auth.uid() = user_id);
