-- BuildOps invoicing module — add columns missing from the live table
-- Paste ENTIRE file into Supabase SQL Editor → Run
-- Safe to run multiple times.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_ref text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes text;

NOTIFY pgrst, 'reload schema';
