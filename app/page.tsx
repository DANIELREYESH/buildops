'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [step, setStep] = useState<'choose' | 'company' | 'client' | 'register'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.user) {
        await supabase.from('companies').insert({ name: companyName, email })
        alert('Cuenta creada. Revisa tu email para confirmar.')
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="p-8 text-center border-b border-gray-100">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-orange-500 font-bold text-xl font-mono">B</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BuildOps</h1>
          <p className="text-gray-400 text-sm mt-1">Construction Platform · by Helion Tech</p>
        </div>

        <div className="p-8">

          {/* STEP 1: Choose */}
          {step === 'choose' && (
            <div>
              <p className="text-center font-semibold mb-4">¿Cómo usas BuildOps?</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setStep('company')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🏗️</div>
                  <div className="font-semibold text-sm">Empresa</div>
                  <div className="text-gray-400 text-xs mt-1">Admin, Director, Worker</div>
                </button>
                <button
                  onClick={() => setStep('client')}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🏠</div>
                  <div className="font-semibold text-sm">Cliente</div>
                  <div className="text-xs text-gray-400 mt-1">Seguimiento de obra</div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Company Login */}
          {step === 'company' && (
            <div>
              <p className="font-semibold mb-4">Login empresa</p>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="tu@empresa.com"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-gray-100"></div>
                <span className="text-xs text-gray-400">¿Sin cuenta?</span>
                <div className="flex-1 h-px bg-gray-100"></div>
              </div>
              <button
                onClick={() => setStep('register')}
                className="w-full border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Registrar empresa
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-gray-400 text-xs mt-3 hover:text-gray-600">
                ← Volver
              </button>
            </div>
          )}

          {/* STEP 3: Register */}
          {step === 'register' && (
            <div>
              <p className="font-semibold mb-4">Registrar empresa</p>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Nombre de empresa</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="e.g. Helion Tech Ltd"
                />
              </div>
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email admin</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="admin@empresa.com"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Min 8 caracteres"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-orange-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </button>
              <button onClick={() => setStep('company')} className="w-full text-gray-400 text-xs mt-3 hover:text-gray-600">
                ← Volver
              </button>
            </div>
          )}

          {/* STEP 4: Client */}
          {step === 'client' && (
            <div>
              <p className="font-semibold mb-4">Acceso cliente</p>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="tu@email.com"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Acceder a mi proyecto'}
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-gray-400 text-xs mt-3 hover:text-gray-600">
                ← Volver
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}