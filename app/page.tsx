'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [step, setStep] = useState<'choose' | 'company' | 'client' | 'register'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const inputCls = 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent'
  const labelCls = 'text-xs font-semibold text-text-muted block mb-1'

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="p-8 text-center border-b border-border">
          <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-accent font-bold text-xl font-mono">B</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">BuildOps</h1>
          <p className="text-text-muted text-sm mt-1">Construction Platform · by Helion Tech</p>
        </div>

        <div className="p-8">

          {/* STEP 1: Choose */}
          {step === 'choose' && (
            <div>
              <p className="text-center font-semibold mb-4 text-text-primary">¿Cómo usas BuildOps?</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setStep('company')}
                  className="p-4 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🏗️</div>
                  <div className="font-semibold text-sm text-text-primary">Empresa</div>
                  <div className="text-text-muted text-xs mt-1">Admin, Director, Worker</div>
                </button>
                <button
                  onClick={() => setStep('client')}
                  className="p-4 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-left"
                >
                  <div className="text-2xl mb-2">🏠</div>
                  <div className="font-semibold text-sm text-text-primary">Cliente</div>
                  <div className="text-xs text-text-muted mt-1">Seguimiento de obra</div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Company Login */}
          {step === 'company' && (
            <div>
              <p className="font-semibold mb-4 text-text-primary">Login empresa</p>
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="tu@empresa.com" />
              </div>
              <div className="mb-4">
                <label className={labelCls}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className={inputCls} placeholder="••••••••" />
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-muted">¿Sin cuenta?</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button onClick={() => setStep('register')}
                className="w-full border border-border text-text-secondary rounded-lg py-2.5 text-sm font-semibold hover:bg-muted transition-all">
                Registrar empresa
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-text-muted text-xs mt-3 hover:text-text-secondary">
                ← Volver
              </button>
            </div>
          )}

          {/* STEP 3: Register */}
          {step === 'register' && (
            <div>
              <p className="font-semibold mb-4 text-text-primary">Registrar empresa</p>
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className={labelCls}>Nombre de empresa</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className={inputCls} placeholder="e.g. Helion Tech Ltd" />
              </div>
              <div className="mb-3">
                <label className={labelCls}>Email admin</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="admin@empresa.com" />
              </div>
              <div className="mb-4">
                <label className={labelCls}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className={inputCls} placeholder="Min 8 caracteres" />
              </div>
              <button onClick={handleRegister} disabled={loading}
                className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all disabled:opacity-50">
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </button>
              <button onClick={() => setStep('company')} className="w-full text-text-muted text-xs mt-3 hover:text-text-secondary">
                ← Volver
              </button>
            </div>
          )}

          {/* STEP 4: Client */}
          {step === 'client' && (
            <div>
              <p className="font-semibold mb-4 text-text-primary">Acceso cliente</p>
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              <div className="mb-3">
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} placeholder="tu@email.com" />
              </div>
              <div className="mb-4">
                <label className={labelCls}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className={inputCls} placeholder="••••••••" />
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full bg-success text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                {loading ? 'Entrando...' : 'Acceder a mi proyecto'}
              </button>
              <button onClick={() => setStep('choose')} className="w-full text-text-muted text-xs mt-3 hover:text-text-secondary">
                ← Volver
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
