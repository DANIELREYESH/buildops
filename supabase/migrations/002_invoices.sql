-- BuildOps invoicing module migration
-- Paste ENTIRE file into Supabase SQL Editor → Run
-- Safe to run multiple times.

SET search_path = public;

CREATE TABLE IF NOT EXISTS invoices (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_name  text NOT NULL,
  client_email text,
  line_items   jsonb DEFAULT '[]',
  subtotal     numeric(10,2) DEFAULT 0,
  vat          numeric(10,2) DEFAULT 0,
  total        numeric(10,2) DEFAULT 0,
  status       text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  due_date     date,
  invoice_ref  text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);
GRANT ALL ON invoices TO anon, authenticated, service_role;
