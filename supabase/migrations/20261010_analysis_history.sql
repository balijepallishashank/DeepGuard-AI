-- =============================================================================
-- DeepGuard AI — Cloud Analysis History Migration
-- Table: public.analysis_history
-- Enforces PostgreSQL Row Level Security (RLS) referencing auth.users
-- =============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.analysis_history (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
    title TEXT NOT NULL,
    classification TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    trust_score DOUBLE PRECISION NOT NULL,
    sha256 TEXT NOT NULL,
    summary_text TEXT,
    record_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for fast user queries, ordering, and deduplication
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_created 
    ON public.analysis_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_sha256 
    ON public.analysis_history (user_id, sha256);

CREATE INDEX IF NOT EXISTS idx_analysis_history_media_type 
    ON public.analysis_history (user_id, media_type);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- 4. Strictly isolated user policies using auth.uid()
DROP POLICY IF EXISTS "Users can view their own analysis history" ON public.analysis_history;
CREATE POLICY "Users can view their own analysis history"
    ON public.analysis_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analysis records" ON public.analysis_history;
CREATE POLICY "Users can insert their own analysis records"
    ON public.analysis_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analysis records" ON public.analysis_history;
CREATE POLICY "Users can update their own analysis records"
    ON public.analysis_history FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analysis records" ON public.analysis_history;
CREATE POLICY "Users can delete their own analysis records"
    ON public.analysis_history FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analysis_history TO authenticated;
GRANT ALL ON TABLE public.analysis_history TO service_role;
