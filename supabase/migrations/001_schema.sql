-- Run this in your Supabase SQL editor to set up all BuildOps tables.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Extend projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS workers text[];

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to text,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date date,
  estimated_hours numeric,
  created_at timestamptz DEFAULT now()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text,
  user_name text,
  project_id uuid REFERENCES projects(id),
  clock_in timestamptz,
  clock_out timestamptz,
  hours numeric,
  break_minutes integer DEFAULT 30,
  gps_verified boolean DEFAULT false,
  notes text,
  date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Costs
CREATE TABLE IF NOT EXISTS costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category text CHECK (category IN ('materials','labour','subcontractors','equipment','other')),
  supplier text,
  amount numeric NOT NULL,
  date date DEFAULT current_date,
  receipt_url text,
  notes text,
  logged_by text,
  created_at timestamptz DEFAULT now()
);

-- AI Check-ins
CREATE TABLE IF NOT EXISTS checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  worker_name text,
  worker_phone text,
  message text,
  ai_summary text,
  progress_extracted integer,
  cost_extracted numeric,
  issue_flagged boolean DEFAULT false,
  issue_description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','received','issue','no_response')),
  checkin_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  contract_ref text,
  type text CHECK (type IN ('service','sub','variation','quote')),
  value numeric,
  company_signed_at timestamptz,
  company_signed_by text,
  client_signed_at timestamptz,
  client_signed_by text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','awaiting_client','awaiting_company','active','expired')),
  created_at timestamptz DEFAULT now()
);

-- Client Requests
CREATE TABLE IF NOT EXISTS requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  description text,
  location text,
  budget_estimate numeric,
  job_type text,
  status text DEFAULT 'new' CHECK (status IN ('new','site_visit','quoted','negotiating','won','lost')),
  internal_notes text,
  quote_value numeric,
  created_at timestamptz DEFAULT now()
);

-- Subcontractors
CREATE TABLE IF NOT EXISTS subcontractors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trade text NOT NULL,
  bio text,
  location text,
  day_rate numeric,
  rating numeric DEFAULT 5.0,
  reviews_count integer DEFAULT 0,
  verified boolean DEFAULT false,
  availability boolean DEFAULT true,
  certifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Sub Payments
CREATE TABLE IF NOT EXISTS sub_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id uuid REFERENCES subcontractors(id) NOT NULL,
  project_id uuid REFERENCES projects(id),
  milestone text NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'operative' CHECK (role IN ('admin','manager','supervisor','operative')),
  invite_code text,
  status text DEFAULT 'invited' CHECK (status IN ('active','invited')),
  created_at timestamptz DEFAULT now()
);

-- Seed subcontractors (run once)
INSERT INTO subcontractors (name, trade, bio, location, day_rate, rating, reviews_count, verified, availability, certifications)
SELECT * FROM (VALUES
  ('Marcus Reid',     'Electrician',         '12 years commercial and residential experience. First fix, second fix, and consumer units.',        'Hackney, London',      280, 4.9, 47, true,  true,  '{"verified_id":true,"insured":true,"cscs":true,"niceic":true,"part_p":true}'::jsonb),
  ('Kevin Okafor',    'Plumber',             'Gas Safe registered. Expert in underfloor heating, bathroom installations, and central heating.',   'Brixton, London',      260, 4.7, 31, true,  true,  '{"verified_id":true,"insured":true,"cscs":true,"gas_safe":true}'::jsonb),
  ('Dale Hennessy',   'Plasterer',           'Bonding coat, skim, and dry lining. 18 years experience. Fast, clean worker with references.',     'Croydon, London',      230, 4.8, 62, true,  false, '{"verified_id":true,"insured":true,"cscs":true}'::jsonb),
  ('James Whitfield', 'Roofer',              'Flat and pitched roofing, EPDM rubber, lead work, and guttering. Insured to £2m.',                 'Lewisham, London',     290, 4.6, 28, true,  true,  '{"verified_id":true,"insured":true}'::jsonb),
  ('Piotr Wojcik',    'Groundworker',        'Foundations, drainage, concrete slabs, blockwork. CSCS Gold card. Clean driving licence.',         'Edmonton, London',     240, 4.5, 19, true,  true,  '{"verified_id":true,"insured":true,"cscs":true}'::jsonb),
  ('Tony Adeyemi',    'Carpenter',           'First and second fix carpentry, fitted furniture, and site management. 20 years UK experience.',   'Peckham, London',      250, 4.9, 84, true,  true,  '{"verified_id":true,"insured":true,"cscs":true}'::jsonb),
  ('Ben Ashworth',    'Tiler',               'Wall and floor tiling, wet rooms, and feature walls. Porcelain, ceramic, and natural stone.',      'Islington, London',    220, 4.7, 35, false, false, '{"insured":true,"cscs":true}'::jsonb),
  ('Femi Lawal',      'Painter & Decorator', 'Interior and exterior, spray finish, heritage property specialist. CIS registered.',               'Tottenham, London',    200, 4.8, 51, true,  true,  '{"verified_id":true,"insured":true}'::jsonb)
) AS v(name, trade, bio, location, day_rate, rating, reviews_count, verified, availability, certifications)
WHERE NOT EXISTS (SELECT 1 FROM subcontractors LIMIT 1);
