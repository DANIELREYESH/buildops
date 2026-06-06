// Run: node scripts/migrate.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((v, i) => i === 0 ? v.trim() : v.trim()))
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceKey) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  console.error('   Add it: Settings → API → service_role key in Supabase dashboard')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('🔧  Running BuildOps migration...\n')

  // 1. Add avatar_url column
  console.log('1/3  Adding avatar_url column to subcontractors...')
  const { error: ddlError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS avatar_url text;'
  }).single()

  if (ddlError) {
    // exec_sql rpc may not exist — try direct query via REST
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql: 'ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS avatar_url text;' })
    })
    if (!res.ok) {
      console.warn('   ⚠  Could not run DDL via RPC. Column may already exist — continuing...')
    } else {
      console.log('   ✓  Column added')
    }
  } else {
    console.log('   ✓  Column added')
  }

  // 2. Clear old subcontractors
  console.log('2/3  Clearing old subcontractors...')
  const { error: delError } = await supabase.from('subcontractors').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delError) {
    console.error('   ❌  Delete failed:', delError.message)
    process.exit(1)
  }
  console.log('   ✓  Cleared')

  // 3. Insert new subcontractors
  console.log('3/3  Seeding 8 subcontractors...')
  const BASE = 'https://ui-avatars.com/api/?background=1A1916&color=fff&size=128&rounded=true&bold=true'
  const avatarUrl = (name) => `${BASE}&name=${encodeURIComponent(name)}`

  const subs = [
    {
      name: 'James Mitchell', trade: 'Electrician', location: 'London',
      day_rate: 320, rating: 4.8, reviews_count: 63, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true, niceic: true, part_p: true },
      bio: 'NICEIC-registered electrician with 14 years of commercial and residential experience across London. Specialises in first and second fix, consumer unit upgrades, and EV charger installations.',
      avatar_url: avatarUrl('James Mitchell'),
    },
    {
      name: "Ryan O'Brien", trade: 'Plumber', location: 'Surrey',
      day_rate: 280, rating: 4.9, reviews_count: 81, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true, gas_safe: true },
      bio: 'Gas Safe registered plumber with 11 years across Surrey and South London. Expert in boiler installations, underfloor heating, and full bathroom fit-outs.',
      avatar_url: avatarUrl("Ryan O'Brien"),
    },
    {
      name: 'Thomas Clarke', trade: 'Plasterer', location: 'Kent',
      day_rate: 220, rating: 4.6, reviews_count: 44, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true },
      bio: 'Experienced plasterer covering Kent and South East London with 16 years in bonding coat, skim, and dry lining. Consistently clean finishes with strong client references.',
      avatar_url: avatarUrl('Thomas Clarke'),
    },
    {
      name: 'Mohammed Al-Hassan', trade: 'Roofer', location: 'Essex',
      day_rate: 260, rating: 4.7, reviews_count: 37, verified: true, availability: false,
      certifications: { verified_id: true, insured: true },
      bio: 'Flat and pitched roofing specialist based in Essex with 12 years of experience. Covers EPDM rubber, lead work, guttering, and emergency repairs — fully insured to £5m.',
      avatar_url: avatarUrl('Mohammed Al-Hassan'),
    },
    {
      name: 'David Patel', trade: 'Carpenter', location: 'London',
      day_rate: 240, rating: 4.5, reviews_count: 29, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true },
      bio: 'CSCS Gold card carpenter with 9 years of first and second fix across London new-build and refurbishment sites. Strong in fitted furniture, staircases, and site joinery.',
      avatar_url: avatarUrl('David Patel'),
    },
    {
      name: 'Connor Murphy', trade: 'Tiler', location: 'London',
      day_rate: 200, rating: 4.8, reviews_count: 55, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true },
      bio: 'Tiling specialist with 10 years covering London residential and commercial projects. Expert in large-format porcelain, natural stone, and wet room waterproofing systems.',
      avatar_url: avatarUrl('Connor Murphy'),
    },
    {
      name: 'Sean Williams', trade: 'Painter & Decorator', location: 'Hertfordshire',
      day_rate: 180, rating: 4.3, reviews_count: 22, verified: false, availability: true,
      certifications: { insured: true },
      bio: 'Reliable painter and decorator based in Hertfordshire with 8 years of interior and exterior experience. Spray finish, heritage restoration, and new-build handover specialist.',
      avatar_url: avatarUrl('Sean Williams'),
    },
    {
      name: 'Luke Thompson', trade: 'Scaffolder', location: 'London',
      day_rate: 380, rating: 4.9, reviews_count: 71, verified: true, availability: true,
      certifications: { verified_id: true, insured: true, cscs: true },
      bio: 'NASC-compliant scaffolding contractor with 13 years across London construction sites. Handles complex access solutions, birdcage scaffolds, and rapid-turnaround residential jobs.',
      avatar_url: avatarUrl('Luke Thompson'),
    },
  ]

  const { error: insertError } = await supabase.from('subcontractors').insert(subs)
  if (insertError) {
    console.error('   ❌  Insert failed:', insertError.message)
    process.exit(1)
  }
  console.log('   ✓  8 subcontractors seeded\n')
  console.log('✅  Migration complete!')
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
