'use client'

import AppLayout from '@/app/dashboard/layout'

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <polyline points="9 18 15 12 9 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SuppliersPage() {
  return (
    <AppLayout>
      {/* Topbar */}
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Suppliers & Prices</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs text-gray-500 border border-[#E5E2DB] px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Compare Rates
          </button>
          <button className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#C04A14] transition-colors">
            + Add Supplier
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Suppliers & Prices</h1>
          <p className="text-sm text-gray-400 mt-1">Manage supplier contacts, track pricing, and compare rates for materials and plant hire.</p>
        </div>

        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col items-center text-center py-20 px-8">
          <div className="w-12 h-12 rounded-xl bg-[#F7F6F2] border border-[#E5E2DB] flex items-center justify-center mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="3" width="15" height="13" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="5.5" cy="18.5" r="2.5" stroke="#9CA3AF" strokeWidth="1.5" />
              <circle cx="18.5" cy="18.5" r="2.5" stroke="#9CA3AF" strokeWidth="1.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1.5">No suppliers added</h3>
          <p className="text-sm text-gray-400 max-w-sm">
            Add your trusted suppliers and upload price lists. BuildOps will alert you when better rates are available from vetted suppliers in your area.
          </p>
          <button className="mt-6 bg-[#D4561A] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#C04A14] transition-colors">
            + Add Supplier
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
