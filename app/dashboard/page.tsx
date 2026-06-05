'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({name:'',address:'',client_name:'',budget:'',deadline:''})
  const router = useRouter()
  useEffect(() => {
    const load = async () => {
      const {data:{user}} = await supabase.auth.getUser()
      if (!user){router.push('/');return}
      setUser(user)
      const {data} = await supabase.from('projects').select('*').order('created_at',{ascending:false})
      setProjects(data||[])
      setLoading(false)
    }
    load()
  },[])
  const handleLogout = async () => {await supabase.auth.signOut();router.push('/')}
  const handleNewProject = async () => {
    if(!form.name)return
    setSaving(true);setError('')
    const {data,error:err} = await supabase.from('projects').insert({
      name:form.name,address:form.address,client_name:form.client_name,
      budget:form.budget?parseFloat(form.budget):null,
      deadline:form.deadline||null,status:'active',progress:0
    }).select()
    if(err){setError(err.message);setSaving(false);return}
    if(data){setProjects([data[0],...projects]);setShowModal(false);setForm({name:'',address:'',client_name:'',budget:'',deadline:''})}
    setSaving(false)
  }
  if(loading)return <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center"><div className="text-gray-400 text-sm">Cargando...</div></div>
  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <span className="font-bold text-sm">BuildOps</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg">Cerrar sesion</button>
        </div>
      </div>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-gray-400 text-sm mt-1">Bienvenido a BuildOps</p></div>
          <button onClick={()=>setShowModal(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-all">+ Nuevo Proyecto</button>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proyectos activos</div><div className="text-3xl font-bold">{projects.filter(p=>p.status==='active').length}</div></div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Workers hoy</div><div className="text-3xl font-bold text-green-600">0</div></div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Alertas</div><div className="text-3xl font-bold text-red-500">0</div></div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"><div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Presupuesto total</div><div className="text-3xl font-bold">£{projects.reduce((s,p)=>s+(p.budget||0),0).toLocaleString()}</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="font-semibold text-sm">Proyectos</h2><span className="text-xs text-gray-400">{projects.length} total</span></div>
          {projects.length===0?(
            <div className="p-14 text-center">
              <div className="text-gray-400 text-sm font-medium">No hay proyectos todavia</div>
              <button onClick={()=>setShowModal(true)} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700">Crear primer proyecto</button>
            </div>
          ):(
            <table className="w-full">
              <thead><tr className="bg-gray-50"><th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase text-left">Proyecto</th><th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase text-left">Cliente</th><th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase text-left">Presupuesto</th><th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase text-left">Progreso</th><th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase text-left">Estado</th></tr></thead>
              <tbody>{projects.map(p=>(
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-semibold">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{p.client_name||'—'}</td>
                  <td className="px-5 py-3 text-sm font-mono">{p.budget?`£${Number(p.budget).toLocaleString()}`:'—'}</td>
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-24 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{width:`${p.progress}%`}}></div></div><span className="text-xs text-gray-400">{p.progress}%</span></div></td>
                  <td className="px-5 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600">Activo</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
      {showModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-base">Nuevo Proyecto</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-300 hover:text-gray-500">x</button>
            </div>
            <div className="p-6">
              {error&&<div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</div>}
              <div className="mb-4"><label className="text-xs font-semibold text-gray-500 block mb-1.5">Nombre *</label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" placeholder="ej. Kensington Flat Renovation"/></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Cliente</label><input type="text" value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" placeholder="ej. James Sullivan"/></div>
                <div><label className="text-xs font-semibold text-gray-500 block mb-1.5">Presupuesto (£)</label><input type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" placeholder="ej. 18500"/></div>
              </div>
              <div className="mb-4"><label className="text-xs font-semibold text-gray-500 block mb-1.5">Direccion</label><input type="text" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" placeholder="ej. Kensington W8, London"/></div>
              <div className="mb-6"><label className="text-xs font-semibold text-gray-500 block mb-1.5">Fecha limite</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"/></div>
              <div className="flex gap-3">
                <button onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50">Cancelar</button>
                <button onClick={handleNewProject} disabled={saving||!form.name} className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 disabled:opacity-50">{saving?'Guardando...':'Crear proyecto'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
