-- BuildOps invoicing module — align RLS with the rest of the schema
-- (no other table in this project has row level security enabled;
-- the invoices table got it turned on by default via the Table Editor UI)
-- Paste ENTIRE file into Supabase SQL Editor → Run
-- Safe to run multiple times.

ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
