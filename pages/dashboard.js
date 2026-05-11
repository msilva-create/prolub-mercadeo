import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NuevaSolicitud from '../components/NuevaSolicitud'
import HistorialSolicitudes from '../components/HistorialSolicitudes'
import toast, { Toaster } from 'react-hot-toast'

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [distribuidor, setDistribuidor] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [todosLosSaldos, setTodosLosSaldos] = useState([])
  const [vista, setVista] = useState('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) {
      router.push('/')
      return
    }
    const u = JSON.parse(stored)
    setUser(u)
    cargarDatos(u.id)
  }, [])

  async function cargarDatos(distribuidorId) {
    if (!distribuidorId) return;

    try {
      const { data: dist } = await supabase.from('distribuidores').select('*').eq('distribuidor_id', distribuidorId).single()
      if (dist) setDistribuidor(dist)

      const { data: todos } = await supabase.from('distribuidores').select('*').order('distribuidor_id', { ascending: true })
      setTodosLosSaldos(todos || [])

      const { data: sols } = await supabase.from('solicitudes').select('*').eq('distribuidor_id', distribuidorId).order('created_at', { ascending: false })
      setSolicitudes(sols || [])
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  async function cargarMasivoExcel() {
    const confirmacion = confirm("¿Cargar saldos del Excel?")
    if (!confirmacion) return

    const datosExcel = [
      { id: 'cvc-servitecas', saldo: 2527484 },
      { id: 'los-lagos', saldo: 1274881 },
      { id: 'inversiones-ob', saldo: 1469740 },
      { id: 'lubricartagena', saldo: 1333789 },
      { id: 'ramos-dist', saldo: 2251964 },
      { id: 'universal', saldo: 4700000 }
    ]

    for (const item of datosExcel) {
      await supabase.from('distribuidores').upsert({
        distribuidor_id: item.id,
        saldo_disponible: item.saldo
      }, { onConflict: 'distribuidor_id' })
    }
    toast.success('Saldos actualizados')
    cargarDatos(user.id)
  }

  function handleLogout() {
    sessionStorage.removeItem('prolub_user')
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white">Cargando...</div>

  const saldoTotal = distribuidor?.saldo_disponible || 0
  const totalSolicitado = solicitudes.filter(s => ['pendiente', 'aprobado', 'ejecutado'].includes(s.estado)).reduce((a, s) => a + (s.monto_solicitado || 0), 0)
  const saldoDisponible = saldoTotal - totalSolicitado

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <Toaster />
      <div className="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#1B3A6B] font-bold">
             GULF · {user?.nombre}
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-400">Cerrar sesión</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {user?.id === 'central-gulf' && (
          <div className="mb-8 space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex justify-between items-center shadow-sm">
              <p className="text-sm text-orange-800">Control: Carga saldos de imagen Excel.</p>
              <button onClick={cargarMasivoExcel} className="bg-[#F15A22] text-white font-bold py-2 px-6 rounded-lg">🚀 Cargar Saldos</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Resumen Global</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium">
                {todosLosSaldos.map(s => (
                  <div key={s.distribuidor_id} className="p-2 border-b">
                    <p className="text-[10px] text-[#1B3A6B] uppercase">{s.distribuidor_id.replace(/-/g, ' ')}</p>
                    <p className="font-bold">{formatCOP(s.saldo_disponible)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-6 bg-white rounded-xl shadow-sm border-l-4 border-[#1B3A6B]">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Saldo Asignado</p>
            <p className="text-2xl font-bold text-[#1B3A6B]">{formatCOP(saldoTotal)}</p>
          </div>
          <div className="card p-6 bg-white rounded-xl shadow-sm border-l-4 border-amber-400">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">En Solicitudes</p>
            <p className="text-2xl font-bold text-amber-600">{formatCOP(totalSolicitado)}</p>
          </div>
          <div className="card p-6 bg-white rounded-xl shadow-sm border-l-4 border-[#F15A22]">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">Disponible</p>
            <p className={`text-2xl font-bold ${saldoDisponible < 0 ? 'text-red-600' : 'text-[#F15A22]'}`}>{formatCOP(saldoDisponible)}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => setVista('home')} className={`px-4 py-2 rounded-lg font-bold ${vista === 'home' ? 'bg-[#1B3A6B] text-white' : 'bg-white'}`}>Inicio</button>
          <button onClick={() => setVista('nueva')} className={`px-4 py-2 rounded-lg font-bold ${vista === 'nueva' ? 'bg-[#1B3A6B] text-white' : 'bg-white'}`}>+ Solicitud</button>
        </div>

        {vista === 'home' && <HomeView user={user} onNueva={() => setVista('nueva')} />}
        {vista === 'nueva' && <NuevaSolicitud distribuidorId={user?.id} distribuidorNombre={user?.nombre} saldoDisponible={saldoDisponible} onCreada={() => { cargarDatos(user.id); setVista('home'); }} />}
      </main>
    </div>
  )
}

function HomeView({ user, onNueva }) {
  return (
    <div className="bg-[#1B3A6B] p-8 rounded-2xl text-white shadow-xl">
      <h2 className="text-2xl font-bold mb-2">Bienvenido, {user?.nombre}</h2>
      <p className="text-blue-200 text-sm mb-6">Gestiona tus actividades de mercadeo Gulf.</p>
      <button onClick={onNueva} className="bg-[#F15A22] text-white font-bold py-2 px-6 rounded-lg">Crear Solicitud</button>
    </div>
  )
}
