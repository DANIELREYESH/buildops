export interface Project {
  id: string
  name: string
  address: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  budget: number | null
  deadline: string | null
  status: 'active' | 'delayed' | 'on_hold' | 'completed'
  progress: number
  description: string | null
  workers: string[] | null
  created_at: string
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  description: string | null
  assigned_to: string | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  estimated_hours: number | null
  created_at: string
}

export interface Timesheet {
  id: string
  user_email: string
  user_name: string
  project_id: string | null
  clock_in: string | null
  clock_out: string | null
  hours: number | null
  break_minutes: number
  gps_verified: boolean
  notes: string | null
  date: string
  created_at: string
}

export interface Cost {
  id: string
  project_id: string | null
  category: 'materials' | 'labour' | 'subcontractors' | 'equipment' | 'other'
  supplier: string | null
  amount: number
  date: string
  receipt_url: string | null
  notes: string | null
  logged_by: string | null
  created_at: string
}

export interface Checkin {
  id: string
  project_id: string | null
  worker_name: string
  worker_phone: string | null
  message: string
  ai_summary: string | null
  progress_extracted: number | null
  cost_extracted: number | null
  issue_flagged: boolean
  issue_description: string | null
  status: 'pending' | 'received' | 'issue' | 'no_response'
  checkin_date: string
  created_at: string
}

export interface Contract {
  id: string
  project_id: string | null
  contract_ref: string
  type: 'service' | 'sub' | 'variation' | 'quote'
  value: number | null
  company_signed_at: string | null
  company_signed_by: string | null
  client_signed_at: string | null
  client_signed_by: string | null
  status: 'draft' | 'awaiting_client' | 'awaiting_company' | 'active' | 'expired'
  created_at: string
}

export interface Request {
  id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  description: string | null
  location: string | null
  budget_estimate: number | null
  job_type: string | null
  status: 'new' | 'site_visit' | 'quoted' | 'negotiating' | 'won' | 'lost'
  internal_notes: string | null
  quote_value: number | null
  created_at: string
}

export interface Subcontractor {
  id: string
  name: string
  trade: string
  bio: string | null
  location: string | null
  day_rate: number | null
  rating: number | null
  reviews_count: number | null
  verified: boolean
  availability: boolean
  certifications: Record<string, boolean> | null
  created_at: string
}

export interface SubPayment {
  id: string
  sub_id: string
  project_id: string | null
  milestone: string
  amount: number
  due_date: string | null
  status: 'pending' | 'approved' | 'processing' | 'paid'
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'supervisor' | 'operative'
  invite_code: string | null
  status: 'active' | 'invited'
  created_at: string
}
