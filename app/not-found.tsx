import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 bg-[#6366f1] rounded-xl flex items-center justify-center mb-6">
        <span className="text-white font-black text-lg">B</span>
      </div>
      <p className="text-6xl font-bold text-[#1f1f1f] mb-4 select-none">404</p>
      <h1 className="text-xl font-semibold text-[#fafafa] mb-2">Page not found</h1>
      <p className="text-sm text-[#52525b] mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
