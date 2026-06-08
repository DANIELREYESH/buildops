CREATE TABLE IF NOT EXISTS ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_health TEXT,
  projects JSONB DEFAULT '[]',
  executive_summary TEXT,
  top_3_risks TEXT[] DEFAULT '{}',
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_forecasts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON ai_forecasts TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
