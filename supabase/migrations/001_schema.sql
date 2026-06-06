-- BuildOps full schema migration
-- Paste ENTIRE file into Supabase SQL Editor → Run
-- Safe to run multiple times.

SET search_path = public;

-- ── Extend projects ────────────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS workers      text[];

-- ── Tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  assigned_to    text,
  status         text DEFAULT 'todo'   CHECK (status   IN ('todo','in_progress','done','blocked')),
  priority       text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date       date,
  estimated_hours numeric,
  created_at     timestamptz DEFAULT now()
);
GRANT ALL ON tasks TO anon, authenticated, service_role;

-- ── Timesheets ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timesheets (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email     text,
  user_name      text,
  project_id     uuid REFERENCES projects(id),
  clock_in       timestamptz,
  clock_out      timestamptz,
  hours          numeric,
  break_minutes  integer DEFAULT 30,
  gps_verified   boolean DEFAULT false,
  notes          text,
  date           date DEFAULT current_date,
  created_at     timestamptz DEFAULT now()
);
GRANT ALL ON timesheets TO anon, authenticated, service_role;

-- ── Costs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS costs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  category    text CHECK (category IN ('materials','labour','subcontractors','equipment','other')),
  supplier    text,
  amount      numeric NOT NULL,
  date        date DEFAULT current_date,
  receipt_url text,
  notes       text,
  logged_by   text,
  created_at  timestamptz DEFAULT now()
);
GRANT ALL ON costs TO anon, authenticated, service_role;

-- ── AI Check-ins ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id          uuid REFERENCES projects(id),
  worker_name         text,
  worker_phone        text,
  message             text,
  ai_summary          text,
  progress_extracted  integer,
  cost_extracted      numeric,
  issue_flagged       boolean DEFAULT false,
  issue_description   text,
  status              text DEFAULT 'pending' CHECK (status IN ('pending','received','issue','no_response')),
  checkin_date        date DEFAULT current_date,
  created_at          timestamptz DEFAULT now()
);
GRANT ALL ON checkins TO anon, authenticated, service_role;

-- ── Contracts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        uuid REFERENCES projects(id),
  contract_ref      text,
  type              text CHECK (type IN ('service','sub','variation','quote')),
  value             numeric,
  company_signed_at timestamptz,
  company_signed_by text,
  client_signed_at  timestamptz,
  client_signed_by  text,
  status            text DEFAULT 'draft' CHECK (status IN ('draft','awaiting_client','awaiting_company','active','expired')),
  created_at        timestamptz DEFAULT now()
);
GRANT ALL ON contracts TO anon, authenticated, service_role;

-- ── Client Requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name     text NOT NULL,
  client_email    text,
  client_phone    text,
  description     text,
  location        text,
  budget_estimate numeric,
  job_type        text,
  status          text DEFAULT 'new' CHECK (status IN ('new','site_visit','quoted','negotiating','won','lost')),
  internal_notes  text,
  quote_value     numeric,
  created_at      timestamptz DEFAULT now()
);
GRANT ALL ON requests TO anon, authenticated, service_role;

-- ── Subcontractors ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontractors (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text NOT NULL,
  trade          text NOT NULL,
  bio            text,
  location       text,
  day_rate       numeric,
  rating         numeric DEFAULT 5.0,
  reviews_count  integer DEFAULT 0,
  verified       boolean DEFAULT false,
  availability   boolean DEFAULT true,
  certifications jsonb DEFAULT '{}',
  avatar_url     text,
  created_at     timestamptz DEFAULT now()
);
GRANT ALL ON subcontractors TO anon, authenticated, service_role;

-- ── Sub Payments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_payments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id     uuid REFERENCES subcontractors(id) NOT NULL,
  project_id uuid REFERENCES projects(id),
  milestone  text NOT NULL,
  amount     numeric NOT NULL,
  due_date   date,
  status     text DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid')),
  paid_at    timestamptz,
  notes      text,
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON sub_payments TO anon, authenticated, service_role;

-- ── Team Members ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  email       text UNIQUE NOT NULL,
  role        text DEFAULT 'operative' CHECK (role IN ('admin','manager','supervisor','operative')),
  invite_code text,
  status      text DEFAULT 'invited' CHECK (status IN ('active','invited')),
  created_at  timestamptz DEFAULT now()
);
GRANT ALL ON team_members TO anon, authenticated, service_role;

-- ── Seed subcontractors ───────────────────────────────────────────────────────
INSERT INTO subcontractors (name, trade, bio, location, day_rate, rating, reviews_count, verified, availability, certifications, avatar_url)
SELECT * FROM (VALUES
  (
    'James Mitchell', 'Electrician',
    'NICEIC-registered electrician with 14 years of commercial and residential experience across London. Specialises in first and second fix, consumer unit upgrades, and EV charger installations.',
    'London', 320::numeric, 4.8::numeric, 63, true, true,
    '{"verified_id":true,"insured":true,"cscs":true,"niceic":true,"part_p":true}'::jsonb,
    'https://ui-avatars.com/api/?name=James+Mitchell&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Ryan O''Brien', 'Plumber',
    'Gas Safe registered plumber with 11 years across Surrey and South London. Expert in boiler installations, underfloor heating, and full bathroom fit-outs.',
    'Surrey', 280::numeric, 4.9::numeric, 81, true, true,
    '{"verified_id":true,"insured":true,"cscs":true,"gas_safe":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Ryan+O%27Brien&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Thomas Clarke', 'Plasterer',
    'Experienced plasterer covering Kent and South East London with 16 years in bonding coat, skim, and dry lining. Consistently clean finishes with strong client references.',
    'Kent', 220::numeric, 4.6::numeric, 44, true, true,
    '{"verified_id":true,"insured":true,"cscs":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Thomas+Clarke&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Mohammed Al-Hassan', 'Roofer',
    'Flat and pitched roofing specialist based in Essex with 12 years of experience. Covers EPDM rubber, lead work, guttering, and emergency repairs — fully insured to £5m.',
    'Essex', 260::numeric, 4.7::numeric, 37, true, false,
    '{"verified_id":true,"insured":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Mohammed+Al-Hassan&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'David Patel', 'Carpenter',
    'CSCS Gold card carpenter with 9 years of first and second fix across London new-build and refurbishment sites. Strong in fitted furniture, staircases, and site joinery.',
    'London', 240::numeric, 4.5::numeric, 29, true, true,
    '{"verified_id":true,"insured":true,"cscs":true}'::jsonb,
    'https://ui-avatars.com/api/?name=David+Patel&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Connor Murphy', 'Tiler',
    'Tiling specialist with 10 years covering London residential and commercial projects. Expert in large-format porcelain, natural stone, and wet room waterproofing systems.',
    'London', 200::numeric, 4.8::numeric, 55, true, true,
    '{"verified_id":true,"insured":true,"cscs":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Connor+Murphy&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Sean Williams', 'Painter & Decorator',
    'Reliable painter and decorator based in Hertfordshire with 8 years of interior and exterior experience. Spray finish, heritage restoration, and new-build handover specialist.',
    'Hertfordshire', 180::numeric, 4.3::numeric, 22, false, true,
    '{"insured":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Sean+Williams&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  ),
  (
    'Luke Thompson', 'Scaffolder',
    'NASC-compliant scaffolding contractor with 13 years across London construction sites. Handles complex access solutions, birdcage scaffolds, and rapid-turnaround residential jobs.',
    'London', 380::numeric, 4.9::numeric, 71, true, true,
    '{"verified_id":true,"insured":true,"cscs":true}'::jsonb,
    'https://ui-avatars.com/api/?name=Luke+Thompson&background=1A1916&color=fff&size=128&rounded=true&bold=true'
  )
) AS v(name, trade, bio, location, day_rate, rating, reviews_count, verified, availability, certifications, avatar_url)
WHERE NOT EXISTS (SELECT 1 FROM subcontractors LIMIT 1);

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
