CREATE TABLE IF NOT EXISTS ai_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  summary TEXT,
  risks TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  safety_flags TEXT[] DEFAULT '{}',
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_checkins DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ai_checkins TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
