'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Page = 'home' | 'features' | 'pricing' | 'blog' | 'about'
type ModalType = 'demo' | 'contact' | null

function BarChart({ values, colorFn }: { values: number[]; colorFn: (i: number) => string }) {
  const max = Math.max(...values)
  return (
    <>
      {values.map((v, i) => (
        <div
          key={i}
          className="bbar"
          style={{
            height: `${Math.max(Math.round((v / max) * 100), 4)}%`,
            background: colorFn(i),
          }}
        />
      ))}
    </>
  )
}

const LOGO_ITEMS = [
  { name: 'Ironclad Builds', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#111827"/><polyline points="5,20 9,12 14,16.5 18.5,9 23,20" stroke="#5B50FF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18.5" cy="9" r="1.8" fill="#8B5CF6"/></svg> },
  { name: 'Meridian Contractors', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#0C3040"/><circle cx="14" cy="14" r="7" stroke="#06B6D4" strokeWidth="1.8" fill="none"/><line x1="14" y1="7" x2="14" y2="21" stroke="#06B6D4" strokeWidth="1.4"/><line x1="7" y1="14" x2="21" y2="14" stroke="#06B6D4" strokeWidth="1.4"/><circle cx="14" cy="14" r="2.2" fill="#06B6D4"/></svg> },
  { name: 'Thornwood Civil', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#1C1200"/><polygon points="14,5 23,22 5,22" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinejoin="round"/><line x1="14" y1="10" x2="14" y2="17" stroke="#F59E0B" strokeWidth="1.4"/><circle cx="14" cy="19.5" r="1.2" fill="#F59E0B"/></svg> },
  { name: 'Ashfield Group', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#0F1F40"/><rect x="6" y="14" width="5" height="9" fill="#3B82F6" rx="1"/><rect x="13" y="10" width="5" height="13" fill="#3B82F6" rx="1" opacity=".75"/><rect x="19.5" y="17" width="3" height="6" fill="#3B82F6" rx="1" opacity=".5"/><line x1="5" y1="23.5" x2="23" y2="23.5" stroke="#60A5FA" strokeWidth="1"/></svg> },
  { name: 'Kendrick & Sons', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#0D200F"/><line x1="7" y1="7.5" x2="21" y2="7.5" stroke="#22C55E" strokeWidth="1.6"/><line x1="7" y1="11.5" x2="21" y2="11.5" stroke="#22C55E" strokeWidth="1.6" opacity=".7"/><line x1="7" y1="15.5" x2="21" y2="15.5" stroke="#22C55E" strokeWidth="1.6" opacity=".5"/><line x1="7" y1="7.5" x2="7" y2="20.5" stroke="#22C55E" strokeWidth="1.6"/></svg> },
  { name: 'Ellsworth Refurb', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#1A0A30"/><circle cx="14" cy="14" r="8" stroke="#8B5CF6" strokeWidth="1.8" fill="none"/><path d="M10 14 L14 10 L18 14 L14 18 Z" fill="#8B5CF6" opacity=".75"/><circle cx="14" cy="14" r="2" fill="#A78BFA"/></svg> },
  { name: 'Hartstone Build', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#0C2340"/><path d="M7 20 L14 8 L21 20" stroke="#0EA5E9" strokeWidth="1.8" fill="none" strokeLinejoin="round"/><path d="M10 16 L18 16" stroke="#0EA5E9" strokeWidth="1.3"/></svg> },
  { name: 'Pinnacle Fit-outs', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#1A1A1A"/><rect x="7" y="7" width="14" height="14" rx="2" stroke="#E5E7EB" strokeWidth="1.5" fill="none"/><path d="M10 14h8M14 10v8" stroke="#E5E7EB" strokeWidth="1.5"/></svg> },
  { name: 'Greenfield Civil', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#142810"/><path d="M7 21 Q14 6 21 21" fill="none" stroke="#4ADE80" strokeWidth="1.8"/><circle cx="14" cy="11" r="2.5" fill="#4ADE80"/></svg> },
  { name: 'Blackthorn Refurb', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#2D1B00"/><path d="M8 21 L14 7 L20 21" fill="#F97316" opacity=".8"/><path d="M8 21 L14 7 L20 21" fill="none" stroke="#FB923C" strokeWidth="1.2"/></svg> },
  { name: 'Nexus Capital Build', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#0A1628"/><circle cx="10" cy="18" r="3.5" fill="none" stroke="#60A5FA" strokeWidth="1.5"/><circle cx="18" cy="10" r="3.5" fill="none" stroke="#60A5FA" strokeWidth="1.5"/><line x1="12.5" y1="15.5" x2="15.5" y2="12.5" stroke="#60A5FA" strokeWidth="1.3"/></svg> },
  { name: 'Sterling & Co.', svg: <svg width="26" height="26" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#1A0028"/><path d="M6 22 L10 10 L14 16 L18 9 L22 22Z" fill="#C026D3" opacity=".4"/><path d="M6 22 L10 10 L14 16 L18 9 L22 22" stroke="#E879F9" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg> },
]

const CheckIcon = () => (
  <svg viewBox="0 0 9 9" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M1.5 4.5l2.5 2.5 4-5" />
  </svg>
)
const VerifiedIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="5" fill="#16A34A" />
    <path d="M3 5.5l1.8 1.8 3.2-3.2" stroke="white" strokeWidth="1.4" />
  </svg>
)

export default function MarketingClient() {
  const [activePage, setActivePage] = useState<Page>('home')
  const [modal, setModal] = useState<{ open: boolean; type: ModalType }>({ open: false, type: null })
  const [submitted, setSubmitted] = useState(false)

  const PAGE_MAP: Record<Page, number> = { home: 0, features: 1, pricing: 2, blog: 3, about: 4 }

  const go = (page: Page) => {
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openModal = (type: ModalType) => {
    setSubmitted(false)
    setModal({ open: true, type })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal({ open: false, type: null })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const cashflowColors = (i: number) => {
    const riskColor = '#FCA5A5'
    const inColor = 'linear-gradient(to top,#5B50FF,#8B5CF6)'
    const outColor = 'linear-gradient(to top,#BBF7D0,#4ADE80)'
    if (i >= 6) return outColor
    if ([4, 5].includes(i)) return riskColor
    return inColor
  }

  const LogoSet = () => (
    <div className="carousel-set">
      {LOGO_ITEMS.map(item => (
        <div key={item.name} className="lco">
          {item.svg}
          <span className="lco-name">{item.name}</span>
        </div>
      ))}
    </div>
  )

  const BuildOpsLogo = ({ id, size = 34 }: { id: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B50FF" /><stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="34" height="34" rx="9" fill={`url(#${id})`} />
      <path d="M7 25 L12 11.5 L16.5 19 L21 14 L27 25 Z" fill="white" opacity=".95" />
      <circle cx="21" cy="14" r="2" fill="white" opacity=".9" />
      <path d="M7 25 L12 11.5 L16.5 19 L21 14 L27 25" stroke="white" strokeWidth=".6" strokeLinejoin="round" fill="none" opacity=".3" />
    </svg>
  )

  const modalTitle = modal.type === 'contact' ? 'Get in touch' : 'Book a free demo'
  const modalDesc = modal.type === 'contact'
    ? 'Drop us a message and we\'ll get back within one business day.'
    : '30 minutes with our team. We\'ll walk through BuildOps for your specific business.'

  return (
    <>
      {/* NAV */}
      <nav className="bo-nav">
        <div className="ni">
          <div className="bo-logo" onClick={() => go('home')}>
            <BuildOpsLogo id="lg-nav" size={34} />
            <span className="bo-logo-text">Build<span>Ops</span></span>
          </div>
          <div className="nls">
            <span className={`nl${activePage === 'home' ? ' on' : ''}`} onClick={() => go('home')}>Home</span>
            <span className={`nl${activePage === 'features' ? ' on' : ''}`} onClick={() => go('features')}>Features</span>
            <span className={`nl${activePage === 'pricing' ? ' on' : ''}`} onClick={() => go('pricing')}>Pricing</span>
            <span className={`nl${activePage === 'blog' ? ' on' : ''}`} onClick={() => go('blog')}>Blog</span>
            <span className={`nl${activePage === 'about' ? ' on' : ''}`} onClick={() => go('about')}>About</span>
          </div>
          <div className="nr">
            <Link href="/login" className="btn bg2">Log in</Link>
            <button className="btn bp" onClick={() => openModal('demo')}>Book a demo &rarr;</button>
          </div>
        </div>
      </nav>

      {/* ── HOME ── */}
      {activePage === 'home' && (
        <div>
          <section className="hero">
            <div className="hglow" /><div className="hglow2" />
            <div className="hi">
              <div className="hpill"><span className="hpill-b">New</span> AI cashflow forecasting — now live for all plans</div>
              <h1 className="hh1">The construction OS<br />for <em>UK contractors</em></h1>
              <p className="hsub">Invoicing, cashflow prediction, smart contracts and AI insights — built for SME contractors across England, Scotland and Wales.</p>
              <div className="hctas">
                <button className="btn bp bxl" onClick={() => openModal('demo')}>Book a free demo &rarr;</button>
                <button className="btn bo2 blg" onClick={() => go('features')}>Explore features</button>
              </div>
              <div className="htrust">
                <div className="havs">
                  <div className="hav" style={{ background: '#5B50FF' }}>TM</div>
                  <div className="hav" style={{ background: '#16A34A' }}>SR</div>
                  <div className="hav" style={{ background: '#D97706' }}>DC</div>
                  <div className="hav" style={{ background: '#06B6D4' }}>JW</div>
                  <div className="hav" style={{ background: '#8B5CF6' }}>RK</div>
                </div>
                &nbsp;200+ UK contractors in early access &nbsp;·&nbsp; ★★★★★ 4.9&thinsp;/&thinsp;5
              </div>
              {/* Dashboard Mockup */}
              <div className="hmock">
                <div className="hmock-card">
                  <div className="hmc-bar">
                    <div className="hmc-dot" style={{ background: '#FF5F57' }} />
                    <div className="hmc-dot" style={{ background: '#FEBC2E' }} />
                    <div className="hmc-dot" style={{ background: '#28C840' }} />
                    <div className="hmc-url">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#A1A1AA" strokeWidth="1.2" /><path d="M5 1c-1.1 1.2-1.8 2.4-1.8 4S3.9 8.8 5 10M5 1c1.1 1.2 1.8 2.4 1.8 4S6.1 8.8 5 10M1 5h8" stroke="#A1A1AA" strokeWidth="1.2" /></svg>
                      app.buildops.app
                    </div>
                  </div>
                  <div className="hmc-body">
                    <div className="hmc-side">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px 10px', borderBottom: '1px solid #EBEBEB', marginBottom: 4 }}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><defs><linearGradient id="lgs2" x1="0" y1="0" x2="20" y2="20"><stop stopColor="#5B50FF" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient></defs><rect width="20" height="20" rx="5" fill="url(#lgs2)" /><path d="M4 15 L7.5 7 L10.5 12 L13 9 L16 15Z" fill="white" opacity=".95" /><circle cx="13" cy="9" r="1.3" fill="white" /></svg>
                        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-.4px', color: '#09090B' }}>BuildOps</span>
                        <span style={{ fontSize: 8, background: '#EEF2FF', color: '#4338CA', fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginLeft: 'auto', letterSpacing: '.2px' }}>BETA</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#71717A', padding: '5px 10px 4px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #EBEBEB', marginBottom: 4 }}>
                        <span style={{ width: 18, height: 18, background: '#EEF2FF', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#4338CA', flexShrink: 0 }}>HT</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#3F3F46', letterSpacing: '-.2px' }}>Helion Tech Ltd</span>
                      </div>
                      <div className="hmc-side-sect">Workspace</div>
                      <div className="hmc-ni on"><svg viewBox="0 0 14 14"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="8" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="1.5" y="8" width="4.5" height="4.5" rx="1" /><rect x="8" y="8" width="4.5" height="4.5" rx="1" /></svg>Dashboard</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><path d="M1 11.5 L4.5 4.5 L7 8 L9.5 5.5 L13 11.5" /></svg>Projects</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><path d="M2.5 2h9v2.5H2.5zM2.5 6.5h9M2.5 9.5h6" /></svg>Tasks</div>
                      <div className="hmc-side-sect">Field Ops</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 2" /></svg>AI Check-ins</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><path d="M2 2h10v10.5a1 1 0 01-1 1H3a1 1 0 01-1-1V2zM4 2V1h6v1M4.5 5.5h5M4.5 7.5h3" /></svg>Contracts</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><rect x="1.5" y="4" width="11" height="8.5" rx="1.5" /><path d="M4 4V3a3 3 0 016 0v1" /></svg>Banking</div>
                      <div className="hmc-side-sect">Finance</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" /><path d="M4.5 2.5V1M9.5 2.5V1M1.5 6h11" /></svg>Invoicing</div>
                      <div className="hmc-ni"><svg viewBox="0 0 14 14"><path d="M1.5 10 L4.5 5 L7.5 7.5 L9.5 3 L12.5 8" /></svg>Cashflow</div>
                    </div>
                    <div className="dash-main">
                      <div className="dash-greeting">
                        <div className="dash-greeting-ico">🤖</div>
                        <div className="dash-greeting-text">
                          <div className="dash-greeting-name">Good evening, Daniel</div>
                          <div className="dash-greeting-date">Tuesday, 9 June 2026</div>
                          <div className="dash-priority">Today's Priority</div>
                          <div className="dash-priority-text">Chase Polypipe immediately for the overdue 500mm floor panel delivery — James Reid needs this resolved today.</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" stroke="#EBEBEB" strokeWidth="2.5" /><circle cx="18" cy="18" r="16" stroke="#4338CA" strokeWidth="2.5" strokeDasharray="88 13" strokeLinecap="round" transform="rotate(-90 18 18)" /><text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="800" fill="#09090B" fontFamily="Inter,sans-serif">7</text></svg>
                          <div style={{ fontSize: 8, color: '#A1A1AA', marginTop: 2, fontWeight: 500 }}>projects</div>
                        </div>
                      </div>
                      <div className="dash-kpis">
                        <div className="dash-kpi"><div className="dash-kpi-l">Active Projects</div><div className="dash-kpi-n">5</div><div className="dash-kpi-c kpi-up"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>+12% vs last month</div></div>
                        <div className="dash-kpi"><div className="dash-kpi-l">Open Tasks</div><div className="dash-kpi-n">12</div><div className="dash-kpi-c kpi-dn"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>+4% vs last month</div></div>
                        <div className="dash-kpi"><div className="dash-kpi-l">Pending Invoices</div><div className="dash-kpi-n">£0</div><div className="dash-kpi-c kpi-up"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>+8% vs last month</div></div>
                        <div className="dash-kpi"><div className="dash-kpi-l">Subcontractors</div><div className="dash-kpi-n">8</div><div className="dash-kpi-c kpi-up"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>+2 vs last month</div></div>
                      </div>
                      <div className="dash-bottom">
                        <div className="dash-chart-box">
                          <div className="dash-chart-title">Revenue — last 6 months</div>
                          <div className="dash-chart-val">£16,900<span style={{ fontSize: 11, fontWeight: 500, color: '#A1A1AA' }}>/mo</span><span className="dash-chart-badge"><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 7L4 2.5 6 5l2-3" stroke="currentColor" strokeWidth="1.3" /></svg>+11% MoM</span></div>
                          <svg className="dash-svg-area" viewBox="0 0 240 80" preserveAspectRatio="none">
                            <defs><linearGradient id="areafill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5B50FF" stopOpacity=".18" /><stop offset="100%" stopColor="#5B50FF" stopOpacity="0" /></linearGradient></defs>
                            <path d="M0 72 L40 68 L80 60 L120 50 L160 35 L200 22 L240 10 L240 80 L0 80Z" fill="url(#areafill)" />
                            <path d="M0 72 L40 68 L80 60 L120 50 L160 35 L200 22 L240 10" fill="none" stroke="#5B50FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#A1A1AA', marginTop: 4 }}>
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                          </div>
                        </div>
                        <div className="dash-timeline">
                          <div className="dash-tl-title">Project Timeline</div>
                          {[
                            { name: 'Shoreditch Warehouse', w: 85 },
                            { name: 'Hackney Victorian Refurb', w: 70 },
                            { name: 'Surrey Hills New Build', w: 78 },
                            { name: 'Kensington Loft Conv.', w: 55 },
                            { name: 'Brixton Restaurant', w: 42 },
                            { name: 'Canary Wharf Office', w: 60, color: '#F59E0B' },
                          ].map(p => (
                            <div key={p.name} className="dash-tl-row">
                              <span className="dash-tl-name">{p.name}</span>
                              <div className="dash-tl-bar-wrap"><div className="dash-tl-bar" style={{ width: `${p.w}%`, background: p.color ?? '#5B50FF' }} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Logo Carousel */}
          <div className="lband">
            <p className="lband-lbl">Trusted by growing contractors across the UK</p>
            <div className="carousel-track-wrap">
              <div className="carousel-track">
                <LogoSet /><LogoSet />
              </div>
            </div>
          </div>

          {/* Feature Blocks */}
          <section className="sec">
            <div className="w">
              <div className="fb">
                <div>
                  <div className="fb-badge p">📈 Cashflow intelligence</div>
                  <h3 className="fb-h3">See 90 days ahead.<br />Act before the gap opens.</h3>
                  <p className="fb-p">Late payments end construction businesses — not bad jobs. BuildOps models every contract, invoice and outgoing commitment so you can spot a cashflow problem three weeks before it arrives.</p>
                  <div className="cklist">
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>AI flags late-payer risk from your payment history</div>
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>CIS deduction tracking and monthly return summaries</div>
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>Scenario planner: what if this job slips two weeks?</div>
                  </div>
                  <button className="btn bp blg" onClick={() => openModal('demo')}>See it in action &rarr;</button>
                </div>
                <div className="fb-vis" style={{ padding: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: '#A1A1AA', marginBottom: 18 }}>12-week cashflow forecast</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, marginBottom: 14 }}>
                    <BarChart values={[55, 70, 44, 82, 26, 16, 62, 77, 74, 90, 84, 91]} colorFn={cashflowColors} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#A1A1AA', marginBottom: 20 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: 'linear-gradient(to top,#5B50FF,#8B5CF6)', borderRadius: 2, display: 'inline-block' }} />Projected in</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#FCA5A5', borderRadius: 2, display: 'inline-block' }} />Risk period</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#BBF7D0', borderRadius: 2, display: 'inline-block' }} />Projected out</span>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠ AI Alert — Week 8</div>
                    <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.55 }}>Potential £6,800 shortfall if Thornfield invoice remains unpaid. Chase now to avoid overdraft. <span style={{ color: '#92400E', fontWeight: 600, cursor: 'pointer' }}>Send reminder →</span></div>
                  </div>
                </div>
              </div>
              <div className="fb rev">
                <div>
                  <div className="fb-badge g">🧾 Smart invoicing</div>
                  <h3 className="fb-h3">CIS-ready invoices<br />that chase themselves.</h3>
                  <p className="fb-p">Create professional invoices with CIS deduction fields and retention tracking in under a minute. Automated reminders at 7, 14 and 30 days. Every invoice shows open, viewed and paid status in real time.</p>
                  <div className="cklist">
                    <div className="cki"><div className="ckm g"><CheckIcon /></div>CIS gross/net payment handling built in</div>
                    <div className="cki"><div className="ckm g"><CheckIcon /></div>Retention release tracking and automatic reminders</div>
                    <div className="cki"><div className="ckm g"><CheckIcon /></div>Instant bank transfer links — clients pay faster</div>
                  </div>
                  <button className="btn bp blg" onClick={() => openModal('demo')}>Try it free &rarr;</button>
                </div>
                <div className="fb-vis" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B', letterSpacing: '-.3px' }}>INV-2025-041</div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: '#FEF3C7', color: '#92400E' }}>Overdue 5 days</span>
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 300, letterSpacing: -2, marginBottom: 4 }}>£14,250</div>
                  <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 24 }}>Highgate Renovation — Phase 2 completion</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, paddingBottom: 16, borderBottom: '1px solid #E4E4E7', marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717A' }}>Gross amount</span><span style={{ fontWeight: 500 }}>£15,000</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#71717A' }}>CIS deduction (5%)</span><span style={{ fontWeight: 500, color: '#DC2626' }}>–£750</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Net payable</span><span style={{ color: '#5B50FF' }}>£14,250</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn bp blg" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openModal('demo')}>Send reminder</button>
                    <button className="btn bo2 blg" style={{ flex: 1, justifyContent: 'center' }}>Download PDF</button>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A1A1AA' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />Viewed by client · 3 hours ago
                  </div>
                </div>
              </div>
              <div className="fb">
                <div>
                  <div className="fb-badge a">📄 Smart contracts</div>
                  <h3 className="fb-h3">Legally sound contracts<br />in two minutes flat.</h3>
                  <p className="fb-p">Stop using Word templates from 2018. BuildOps generates CIS-compliant subcontractor agreements and client contracts from a short form — with e-signature via email or QR code on site.</p>
                  <div className="cklist">
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>CIS subcontract and client contract templates</div>
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>E-signature via email link or on-site QR code</div>
                    <div className="cki"><div className="ckm p"><CheckIcon /></div>Auto-renewal alerts 30 days before expiry</div>
                  </div>
                  <button className="btn bp blg" onClick={() => openModal('demo')}>See it in action &rarr;</button>
                </div>
                <div className="fb-vis" style={{ padding: 28 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px', color: '#A1A1AA', marginBottom: 16 }}>Active contracts</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { name: 'Thornfield Developments Ltd', sub: 'Subcontract · Expires Dec 2025', pill: 'Signed', pillStyle: { background: '#DCFCE7', color: '#15803D' }, bg: '#F9F9F8', border: '#E4E4E7' },
                      { name: 'Marcus Electrical Services', sub: 'Subcontract · ⚠ Expires Nov 2025', pill: 'Renew', pillStyle: { background: '#FEF3C7', color: '#92400E' }, bg: '#F9F9F8', border: '#E4E4E7' },
                      { name: 'Highgate Renovation — Client', sub: 'Client contract · Awaiting e-signature', pill: 'Pending', pillStyle: { background: '#EEF2FF', color: '#4338CA' }, bg: '#EEF2FF', border: '#C7D2FE' },
                      { name: 'Cardiff Roofing Ltd', sub: 'Subcontract · Signed 3 months ago', pill: 'Active', pillStyle: { background: '#DCFCE7', color: '#15803D' }, bg: '#F9F9F8', border: '#E4E4E7' },
                    ].map(c => (
                      <div key={c.name} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>{c.sub}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, ...c.pillStyle }}>{c.pill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div className="stats">
                <div className="stat"><div className="stat-n" style={{ color: '#5B50FF' }}>£2.1M</div><div className="stat-l">invoiced through BuildOps in the first 3 months of beta</div></div>
                <div className="stat"><div className="stat-n" style={{ color: '#16A34A' }}>94%</div><div className="stat-l">of invoices paid within 30 days on the platform</div></div>
                <div className="stat"><div className="stat-n">8 hrs</div><div className="stat-l">saved on admin every week per contractor on average</div></div>
                <div className="stat"><div className="stat-n" style={{ color: '#D97706' }}>200+</div><div className="stat-l">UK contractors in early access across England and Wales</div></div>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="sec" style={{ paddingTop: 40 }}>
            <div className="w">
              <div className="ctr" style={{ marginBottom: 56 }}>
                <p className="eyebrow">Customer reviews</p>
                <h2 className="sh2" style={{ maxWidth: 580, margin: '0 auto 16px' }}>Real contractors.<br />Real results.</h2>
                <p className="ssub">We don&rsquo;t cherry-pick. These are from our early access cohort — contractors who put BuildOps through its paces on live jobs.</p>
              </div>
              <div className="rev-top">
                <div>
                  <div className="rev-score-big">4.9</div>
                  <div className="rev-stars-big" style={{ color: '#FBBF24' }}>★★★★★</div>
                  <div className="rev-count">Based on 184 verified reviews</div>
                  <div className="rev-bars">
                    {[{ label: '5★', w: '91%', count: 167 }, { label: '4★', w: '7%', count: 13, bg: '#BBF7D0' }, { label: '3★', w: '2%', count: 3, bg: '#FDE68A' }, { label: '2★', w: '0.5%', count: 1, bg: '#FCA5A5' }, { label: '1★', w: '0%', count: 0, bg: '#FCA5A5' }].map(r => (
                      <div key={r.label} className="rev-bar-row">
                        <span className="rev-bar-label">{r.label}</span>
                        <div className="rev-bar-track"><div className="rev-bar-fill" style={{ width: r.w, ...(r.bg ? { background: r.bg } : {}) }} /></div>
                        <span className="rev-bar-count">{r.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rev-badges">
                    <div className="rev-badge"><div className="rev-badge-ico" style={{ background: '#DCFCE7' }}>✓</div>Verified purchases</div>
                    <div className="rev-badge"><div className="rev-badge-ico" style={{ background: '#EEF2FF' }}>🔒</div>Independent reviews</div>
                    <div className="rev-badge"><div className="rev-badge-ico" style={{ background: '#FEF3C7' }}>🏆</div>Top rated 2025</div>
                  </div>
                </div>
                <div className="rev-quote">
                  <div className="rev-quote-stars" style={{ color: '#FBBF24' }}>★★★★★</div>
                  <p className="rev-quote-text">&ldquo;The cashflow forecast saved us from a serious problem in month two. I could see the gap three weeks out and chased the invoice in time. That one feature paid for the product ten times over.&rdquo;</p>
                  <div className="rev-quote-author">
                    <div className="rev-av" style={{ background: 'linear-gradient(135deg,#5B50FF,#8B5CF6)' }}>TM</div>
                    <div>
                      <div className="rev-author-name">Tom Marsh</div>
                      <div className="rev-author-role">Director · Ironclad Builds, Manchester</div>
                      <div className="rev-verified"><VerifiedIcon />Verified early access customer</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rev-grid">
                {[
                  { init: 'SR', grad: 'linear-gradient(135deg,#16A34A,#059669)', name: 'Sarah Riley', role: 'MD · Thornwood Civil, Bristol', stars: '★★★★★', text: 'We used to spend all Friday doing invoices and chasing payments. BuildOps handles it now. My team is actually on the tools more. I genuinely did not expect software to make that difference in the day-to-day.', company: 'Thornwood Civil', plan: 'BuildOps Pro · 6 months' },
                  { init: 'DC', grad: 'linear-gradient(135deg,#D97706,#B45309)', name: 'David Clarke', role: 'Owner · Ashfield Group, Leeds', stars: '★★★★★', text: 'The contracts feature is excellent. We generate a subcontractor agreement in under two minutes and have it signed before the bloke leaves the meeting. No more chasing paperwork for three weeks after a job starts.', company: 'Ashfield Group', plan: 'BuildOps Pro · 4 months' },
                  { init: 'JW', grad: 'linear-gradient(135deg,#06B6D4,#0284C7)', name: 'James Whitfield', role: 'Director · Meridian Contractors, Birmingham', stars: '★★★★★', text: 'Switched from a spreadsheet setup I\'d used for 8 years. The migration took one afternoon. The AI check-ins are genuinely useful — it flagged a CIS return I\'d forgotten about before it became a problem with HMRC.', company: 'Meridian Contractors', plan: 'BuildOps Pro · 5 months' },
                  { init: 'LB', grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', name: 'Linda Barker', role: 'Operations · Ellsworth Refurb, London', stars: '★★★★★', text: 'We run 20 live projects at any time and BuildOps is the only tool that\'s kept up. The banking integration means I can reconcile everything in one place. It\'s saved us at least one full day a week in admin overhead.', company: 'Ellsworth Refurb', plan: 'BuildOps Enterprise · 7 months' },
                  { init: 'RK', grad: 'linear-gradient(135deg,#16A34A,#0F6B31)', name: 'Ryan Kendrick', role: 'MD · Kendrick & Sons, Sheffield', stars: '★★★★★', text: 'I was sceptical — we\'d tried two other tools that didn\'t understand UK construction at all. BuildOps clearly gets CIS, retention, and how contractors actually work. The pricing is fair and the product does what it says.', company: 'Kendrick & Sons', plan: 'Starter → Pro · 8 months' },
                  { init: 'AW', grad: 'linear-gradient(135deg,#374151,#111827)', name: 'Andrew Walsh', role: 'Director · Thornwood Civil, Cardiff', stars: '★★★★', text: 'Four stars because mobile UX still needs work for site use — but everything else is excellent. The cashflow view alone justifies the cost. We recovered £8,400 in outstanding retention thanks to the automated reminders.', company: 'Thornwood Civil (Cardiff)', plan: 'BuildOps Pro · 3 months' },
                ].map(r => (
                  <div key={r.name} className="rc">
                    <div className="rc-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="rc-av" style={{ background: r.grad }}>{r.init}</div>
                        <div><div className="rc-name">{r.name}</div><div className="rc-role">{r.role}</div></div>
                      </div>
                      <div className="rc-stars">{r.stars}</div>
                    </div>
                    <p className="rc-text">{r.text}</p>
                    <div className="rc-bottom">
                      <div><div className="rc-company">{r.company}</div><div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{r.plan}</div></div>
                      <div className="rc-ver"><VerifiedIcon />Verified</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div className="ctastrip">
                <h2>Start running a tighter<br />business today</h2>
                <p>30 minutes with our team. We&rsquo;ll show you exactly how BuildOps works for contractors your size.</p>
                <div className="ctastrip-btns">
                  <button className="btn bw bxl" onClick={() => openModal('demo')}>Book a free demo &rarr;</button>
                  <button className="btn bgl blg" onClick={() => go('pricing')}>See pricing</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── FEATURES ── */}
      {activePage === 'features' && (
        <div>
          <section style={{ padding: '140px 32px 80px', textAlign: 'center' }}>
            <div className="w ctr">
              <p className="eyebrow">Features</p>
              <h1 className="sh2" style={{ maxWidth: 680, margin: '0 auto 20px' }}>Every tool a UK contractor<br />actually needs</h1>
              <p className="ssub">Six months on sites before we wrote a line of code. No bloat. No features you'll never open.</p>
            </div>
          </section>
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div className="fgrid">
                {[
                  { ico: '#EEF2FF', stroke: '#4338CA', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#4338CA" strokeWidth="1.6"><rect x="3" y="4" width="16" height="15" rx="2" /><path d="M7 2v4M15 2v4M3 10h16" /></svg>, title: 'Smart invoicing', desc: 'CIS-compliant invoices with deduction fields, retention tracking, and automated chasing at 7, 14 and 30 days overdue.' },
                  { ico: '#EEF2FF', stroke: '#4338CA', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#4338CA" strokeWidth="1.6"><path d="M3 18L7 8l4 7 3.5-5.5 4.5 8.5" /></svg>, title: '90-day cashflow AI', desc: 'Models contracts, invoices and outgoings to project cashflow 90 days forward and flag risks before they become crises.' },
                  { ico: '#DCFCE7', stroke: '#15803D', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#15803D" strokeWidth="1.6"><path d="M4 4h14v16H4zM8 4V2h6v2M8 11h6M8 14h4" /></svg>, title: 'Smart contracts', desc: 'CIS subcontractor agreements and client contracts in two minutes. E-signature via email or on-site QR code.' },
                  { ico: '#FEF3C7', stroke: '#92400E', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#92400E" strokeWidth="1.6"><rect x="3" y="6" width="16" height="12" rx="2" /><path d="M7 6V5a4 4 0 018 0v1" /></svg>, title: 'Business banking', desc: 'UK business account with sort code, instant payments, a card for site purchases, and automatic invoice reconciliation.' },
                  { ico: '#EEF2FF', stroke: '#4338CA', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#4338CA" strokeWidth="1.6"><circle cx="11" cy="11" r="8" /><path d="M11 7v4l3 3" /></svg>, title: 'AI daily check-ins', desc: 'Every morning, your AI surfaces what needs attention — delayed payments, contract issues, upcoming CIS deadlines.' },
                  { ico: '#DCFCE7', stroke: '#15803D', svg: <svg viewBox="0 0 22 22" fill="none" stroke="#15803D" strokeWidth="1.6"><path d="M11 3L3 7l8 4 8-4-8-4zM3 11l8 4 8-4M3 15l8 4 8-4" /></svg>, title: 'Project management', desc: 'Track all active projects, budgets and milestones in one view. Sync with site teams via the mobile app.' },
                ].map(f => (
                  <div key={f.title} className="fgc">
                    <div className="fgc-ico" style={{ background: f.ico }}>{f.svg}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 80 }}>
                <div className="ctastrip">
                  <h2>Ready to see it?</h2>
                  <p>30 minutes, no commitment. We'll walk through the features that matter for your business.</p>
                  <div className="ctastrip-btns">
                    <button className="btn bw bxl" onClick={() => openModal('demo')}>Book a free demo &rarr;</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── PRICING ── */}
      {activePage === 'pricing' && (
        <div>
          <section style={{ padding: '140px 32px 60px', textAlign: 'center' }}>
            <div className="w ctr">
              <p className="eyebrow">Pricing</p>
              <h1 className="sh2" style={{ marginBottom: 16 }}>Simple pricing.<br />No surprises.</h1>
              <p className="ssub">Month-to-month. Cancel any time. All plans include unlimited invoices and projects.</p>
            </div>
          </section>
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div className="pgrid">
                <div className="pcard">
                  <div className="pplan">Starter</div>
                  <div className="pprice"><sup>£</sup>49</div>
                  <div className="pper">per month + VAT</div>
                  <div className="pdesc">For sole traders and small operators running up to 5 live projects.</div>
                  <hr className="phr" />
                  <div className="pfl">
                    {['Up to 5 active projects', 'Unlimited invoices', 'CIS invoicing & deductions', '4-week cashflow view', '3 contracts per month'].map(f => <div key={f} className="pfi y"><svg viewBox="0 0 14 14" fill="none" strokeWidth="2.5" stroke="#16A34A"><path d="M2.5 7l3 3 6-6" /></svg>{f}</div>)}
                    {['AI daily check-ins', '90-day AI forecast', 'Business banking'].map(f => <div key={f} className="pfi n"><svg viewBox="0 0 14 14" fill="none" strokeWidth="2.5" stroke="#A1A1AA"><path d="M3 3l8 8M11 3l-8 8" /></svg>{f}</div>)}
                  </div>
                  <Link href="/signup?plan=starter" className="btn bo2 blg" style={{ width: '100%', justifyContent: 'center' }}>Get started</Link>
                </div>
                <div className="pcard feat">
                  <div className="pbadge">Most popular</div>
                  <div className="pplan">Pro</div>
                  <div className="pprice"><sup>£</sup>119</div>
                  <div className="pper">per month + VAT</div>
                  <div className="pdesc">For growing contractors managing multiple sites and subcontractors.</div>
                  <hr className="phr" />
                  <div className="pfl">
                    {['Unlimited projects', 'Unlimited invoices & contracts', 'CIS invoicing & deductions', '90-day AI cashflow forecast', 'AI daily check-ins', 'Smart contract generation', 'Business banking (beta)', 'Up to 5 team members'].map(f => <div key={f} className="pfi y"><svg viewBox="0 0 14 14" fill="none" strokeWidth="2.5" stroke="#16A34A"><path d="M2.5 7l3 3 6-6" /></svg>{f}</div>)}
                  </div>
                  <Link href="/signup?plan=pro" className="btn bp blg" style={{ width: '100%', justifyContent: 'center' }}>Book a demo →</Link>
                </div>
                <div className="pcard">
                  <div className="pplan">Enterprise</div>
                  <div className="pprice" style={{ fontSize: 38, letterSpacing: '-1.5px' }}>Custom</div>
                  <div className="pper">bespoke pricing</div>
                  <div className="pdesc">For larger contractors and groups with multi-entity requirements.</div>
                  <hr className="phr" />
                  <div className="pfl">
                    {['Everything in Pro', 'Unlimited team members', 'Multi-entity / group accounts', 'Dedicated account manager', 'Xero & Sage integrations', 'On-site onboarding', 'White-label option'].map(f => <div key={f} className="pfi y"><svg viewBox="0 0 14 14" fill="none" strokeWidth="2.5" stroke="#16A34A"><path d="M2.5 7l3 3 6-6" /></svg>{f}</div>)}
                  </div>
                  <Link href="/signup?plan=enterprise" className="btn bo2 blg" style={{ width: '100%', justifyContent: 'center' }}>Talk to us</Link>
                </div>
              </div>
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#A1A1AA' }}>All plans include a 14-day free trial. No card required. Prices exclude VAT.</p>
              <div style={{ marginTop: 80, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
                <h2 style={{ fontSize: 38, fontWeight: 300, letterSpacing: '-1.8px', textAlign: 'center', marginBottom: 44 }}>Common questions</h2>
                {[
                  { q: 'Do I need to sign a contract?', a: 'No. BuildOps is month-to-month. Cancel any time with no penalty. We\'d rather earn your business every month than lock you in.' },
                  { q: 'Is BuildOps registered with HMRC for CIS?', a: 'BuildOps produces CIS-compliant invoice formats and tracks deductions, but you remain responsible for your CIS returns. We provide the data and structure; your accountant handles the submission.' },
                  { q: 'Can I import my existing invoices and projects?', a: 'Yes. We support CSV import for invoices, contacts and projects. Pro and Enterprise customers get hands-on migration support from our onboarding team.' },
                  { q: 'How does the AI cashflow forecast work?', a: 'BuildOps models your active contracts, expected payment dates and outgoing commitments to project cashflow forward 90 days. The AI layer learns from your payment history to improve predictions over time.' },
                  { q: 'Is the business banking account a real account?', a: 'The banking feature is currently in beta for Pro customers. It provides a UK business account with sort code and account number, powered by a regulated e-money institution.' },
                ].map(f => (
                  <div key={f.q} className="faq-item">
                    <div className="faq-q">{f.q}</div>
                    <div className="faq-a">{f.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── BLOG ── */}
      {activePage === 'blog' && (
        <div>
          <section style={{ padding: '140px 32px 60px' }}>
            <div className="w">
              <p className="eyebrow">The BuildOps Blog</p>
              <h1 className="sh2" style={{ maxWidth: 520, marginBottom: 12 }}>Practical advice for UK contractors</h1>
              <p style={{ fontSize: 17, color: '#71717A' }}>No fluff. Useful guides on running a tighter construction business.</p>
            </div>
          </section>
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div className="bgrid">
                {[
                  { img: '#EEF2FF', emoji: '🏗️', tag: 'Cashflow', title: 'Why 60% of UK construction businesses fail in year 3 — and how to avoid it', exc: "The most common cause isn't lack of work. It's a cashflow gap that arrives without warning.", meta: 'June 2025 · 8 min read' },
                  { img: '#DCFCE7', emoji: '📋', tag: 'Contracts', title: 'The 7 clauses every UK subcontractor agreement needs in 2025', exc: 'Most contractors use templates from 2018. The legal landscape has changed significantly.', meta: 'May 2025 · 11 min read' },
                  { img: '#FEF3C7', emoji: '💷', tag: 'CIS', title: 'CIS explained: a plain-English guide for contractors and subcontractors', exc: "Construction Industry Scheme rules don't have to be complicated. We break it down clearly.", meta: 'April 2025 · 9 min read' },
                  { img: '#EEF2FF', emoji: '🤖', tag: 'Technology', title: 'How AI is changing construction management — without replacing people', exc: "AI tools in construction aren't science fiction. Here's where they're genuinely useful right now.", meta: 'March 2025 · 7 min read' },
                  { img: '#DCFCE7', emoji: '📊', tag: 'Finance', title: 'Retention money: what it is, how to track it, and how to get it back', exc: 'Retention is one of the biggest sources of hidden cashflow problems in UK construction.', meta: 'February 2025 · 6 min read' },
                  { img: '#FEF3C7', emoji: '🔧', tag: 'Operations', title: "The site manager's weekly checklist: 12 things to review every Monday", exc: 'A practical routine for staying in control across multiple sites without losing your mornings.', meta: 'January 2025 · 5 min read' },
                ].map(post => (
                  <div key={post.title} className="bcard">
                    <div className="bcard-img" style={{ background: post.img }}>{post.emoji}</div>
                    <div className="bcard-body">
                      <div className="btag">{post.tag}</div>
                      <div className="btitle">{post.title}</div>
                      <div className="bexc">{post.exc}</div>
                      <div className="bmeta">{post.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── ABOUT ── */}
      {activePage === 'about' && (
        <div>
          <section style={{ padding: '140px 32px 80px', textAlign: 'center' }}>
            <div className="w ctr">
              <p className="eyebrow">About BuildOps</p>
              <h1 className="sh2" style={{ maxWidth: 620, margin: '0 auto 24px' }}>We built the software<br />we couldn&rsquo;t find</h1>
              <p className="ssub">Every construction management tool on the market was either too complex, too American, or too expensive for a UK SME contractor.</p>
            </div>
          </section>
          <section className="sec" style={{ paddingTop: 0 }}>
            <div className="w">
              <div style={{ maxWidth: 680, margin: '0 auto 80px', fontSize: 17, color: '#71717A', lineHeight: 1.8 }}>
                <p style={{ marginBottom: 20 }}>We spent six months talking to contractors in Manchester, London, Bristol and Leeds before writing a single line of code. The same problems came up again and again: late payments with no system to chase them, spreadsheet cashflow that broke constantly, contracts on WhatsApp, and no way to see the week ahead.</p>
                <p>BuildOps is the answer. Designed for the UK market, built around CIS, and focused on the specific pressure points that put small contractors out of business: cashflow gaps, contract disputes, and wasted admin hours.</p>
              </div>
              <div className="ctr" style={{ marginBottom: 40 }}><h2 className="sh2" style={{ fontSize: 42 }}>The team</h2></div>
              <div className="tgrid">
                {[
                  { init: 'DE', grad: 'linear-gradient(135deg,#5B50FF,#8B5CF6)', name: 'Daniel E.', role: 'Commercial Director' },
                  { init: 'EG', grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', name: 'Elisabet G.', role: 'Chief Executive Officer' },
                  { init: 'MT', grad: 'linear-gradient(135deg,#16A34A,#059669)', name: 'Mike T.', role: 'Head of Product' },
                  { init: 'RL', grad: 'linear-gradient(135deg,#D97706,#B45309)', name: 'Rosa L.', role: 'Lead Engineer' },
                ].map(t => (
                  <div key={t.name} className="tc">
                    <div className="tc-av" style={{ background: t.grad }}>{t.init}</div>
                    <div className="tc-name">{t.name}</div>
                    <div className="tc-role">{t.role}</div>
                  </div>
                ))}
              </div>
              <div className="vgrid">
                {[
                  { h: 'Built for the UK', p: 'CIS, VAT, retention, JCT contracts — we know the UK construction industry because we came from it. No American workarounds or features that don\'t apply here.' },
                  { h: 'Contractor-first', p: "Every feature is designed around what a site manager or business owner actually does day to day. If it doesn't save real time or real money, we don't build it." },
                  { h: 'Privacy by default', p: "Your financial data, contracts and client relationships are yours. We don't sell data, we don't train models on your business information, and we're fully GDPR compliant." },
                  { h: 'Honest pricing', p: 'No annual lock-in. No per-invoice fees. No per-user charges that punish growth. One price that covers everything, every month.' },
                ].map(v => (
                  <div key={v.h} className="vc"><h3>{v.h}</h3><p>{v.p}</p></div>
                ))}
              </div>
              <div style={{ marginTop: 80 }}>
                <div className="ctastrip">
                  <h2>Come build with us</h2>
                  <p>We&rsquo;re early-stage and we&rsquo;d love to hear from contractors, investors and people who want to work on something meaningful.</p>
                  <div className="ctastrip-btns">
                    <button className="btn bw bxl" onClick={() => openModal('demo')}>Book a demo &rarr;</button>
                    <button className="btn bgl blg" onClick={() => openModal('contact')}>Get in touch</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bo-footer">
        <div className="fw">
          <div className="ftop">
            <div>
              <div className="bo-logo" onClick={() => go('home')}>
                <BuildOpsLogo id="lg-footer" size={30} />
                <span className="bo-logo-text">Build<span>Ops</span></span>
              </div>
              <p className="fdesc">Construction management software for UK SME contractors. CIS-ready. Built to keep your business running.</p>
            </div>
            <div className="fcol">
              <h4>Product</h4>
              <a onClick={() => go('features')}>Features</a>
              <a onClick={() => go('pricing')}>Pricing</a>
              <a onClick={() => openModal('demo')}>Book a demo</a>
              <a>Changelog</a>
            </div>
            <div className="fcol">
              <h4>Company</h4>
              <a onClick={() => go('about')}>About</a>
              <a onClick={() => go('blog')}>Blog</a>
              <a>Careers</a>
              <a>Press</a>
            </div>
            <div className="fcol">
              <h4>Legal</h4>
              <a>Privacy policy</a>
              <a>Terms of service</a>
              <a>Cookie settings</a>
              <a>Security</a>
            </div>
          </div>
          <div className="fbot">
            <span>© 2025 BuildOps · Helion Tech Ltd · Registered in England &amp; Wales</span>
            <div className="fbot-links">
              <a>hello@buildops.app</a>
              <a>Twitter</a>
              <a>LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      {modal.open && (
        <div
          className="ov"
          style={{ display: 'flex' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal({ open: false, type: null }) }}
        >
          <div className="mod">
            <button className="mod-x" onClick={() => setModal({ open: false, type: null })}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13" /></svg>
            </button>
            {!submitted ? (
              <div>
                <h2>{modalTitle}</h2>
                <p>{modalDesc}</p>
                <div className="fg"><label>Full name</label><input type="text" placeholder="Tom Marsh" /></div>
                <div className="fg"><label>Business email</label><input type="email" placeholder="tom@ironcladbuilds.co.uk" /></div>
                <div className="fg"><label>Company name</label><input type="text" placeholder="Ironclad Builds Ltd" /></div>
                <div className="fg">
                  <label>Active projects right now</label>
                  <select>
                    <option>1 to 3</option>
                    <option>4 to 10</option>
                    <option>11 to 25</option>
                    <option>More than 25</option>
                  </select>
                </div>
                <button className="btn bp blg" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => setSubmitted(true)}>
                  Request demo →
                </button>
                <p style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>No commitment. We&rsquo;ll get back within one business day.</p>
              </div>
            ) : (
              <div className="suc">
                <div className="suc-ico">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M5 15l6 6L23 7" /></svg>
                </div>
                <h3>You&rsquo;re in the queue ✓</h3>
                <p>We&rsquo;ll send a calendar invite within one business day. Looking forward to showing you around BuildOps.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
