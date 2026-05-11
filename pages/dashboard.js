import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast, { Toaster } from 'react-hot-toast'
import dynamic from 'next/dynamic'

// Cargamos los componentes de forma dinámica para evitar errores de compilación
const NuevaSolicitud = dynamic(() => import('../components/NuevaSolicitud'), { ssr: false })
const HistorialSolicitudes = dynamic(() => import('../components/HistorialSolicitudes'), { ssr: false })

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
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('prolub_user')
      if (!stored) {
        router.push('/')
        return
      }
      const u = JSON.parse(stored)
      setUser(u)
      cargarDatos(u.id)
    }
  }, [])

  async function cargarDatos(distribuidorId) {
    if (!distribuidorId) return
    try {
      const { data: dist } = await supabase.from('distribuidores').select('*').eq('distribuidor_id', distribuidorId).single()
      if (dist) setDistribuidor(dist)

      const { data: todos } = await supabase.from('distribuidores').select('*').order('distribuidor_id', { ascending: true })
      setTodosLosSaldos(todos || [])

      const { data: sols } = await supabase.from('solicitudes').select('*').eq('distribuidor_id', distribuidorId).order('created_at', { ascending: false })
      setSolicitudes(sols || [])
    } catch (e) {
      console.error(e)
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

    const tid = toast.loading('Actualizando...')
    try {
      for (const item of datosExcel) {
        await supabase.from('distribuidores').upsert({
          distribuidor_id: item.id,
          saldo_disponible: item.saldo
        }, { onConflict: 'distribuidor_id' })
      }
      toast.success('Saldos cargados', { id: tid })
      cargarDatos(user.id)
    } catch (e) {
      toast.error('Error', { id: tid })
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  const saldoTotal = distribuidor?.saldo_disponible || 0
  const totalSolicitado = solicitudes?.filter(s => ['pendiente', 'aprobado', 'ejecutado'].includes(s.estado)).reduce((a, s) => a + (s.monto_solicitado || 0), 0) || 0
  const saldoDisponible = saldoTotal - totalSolicitado

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <Toaster />
      <header className="bg-white border-b p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center font-bold text-[#1B3A6B]">
           GULF · {user?.nombre || 'Distribuidor'}
           <button onClick={() => { sessionStorage.removeItem('prolub_user'); router.push('/') }} className="text-gray-400 font-normal text-sm">Salir</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 py-8">
        {user?.id === 'central-gulf' && (
          <div className="mb-8 space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex justify-between items-center shadow-sm">
              <p className="text-sm text-orange-800">Carga de saldos (Imagen Excel)</p>
              <button onClick={cargarMasivoExcel} className="bg-[#F15A22] text-white font-bold py-2 px-6 rounded-lg">🚀 Cargar</button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border text-xs">
              <p className="text-gray-400 font-bold mb-2 uppercase">Saldos Globales</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {todosLosSaldos.map(s => (
                  <div key={s.distribuidor_id} className="border-b py-1">
                    <p className="font-bold text-[#1B3A6B] truncate">{s.distribuidor_id}</p>
                    <p>{formatCOP(s.saldo_disponible)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#1B3A6B]">
            <p className="text-xs text-gray-400 font-bold uppercase">Saldo Asignado</p>
            <p className="text-2xl font-bold">{formatCOP(saldoTotal)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-400">
            <p className="text-xs text-gray-400 font-bold uppercase">En Solicitudes</p>
            <p className="text-2xl font-bold text-amber-600">{formatCOP(totalSolicitado)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#F15A22]">
            <p className="text-xs text-gray-400 font-bold uppercase">Disponible</p>
            <p className="text-2xl font-bold text-[#F15A22]">{formatCOP(saldoDisponible)}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setVista('home')} className={`px-4 py-2 rounded-lg font-bold ${vista === 'home' ? 'bg-[#1B3A6B] text-white' : 'bg-white'}`}>Inicio</button>
          <button onClick={() => setVista('nueva')} className={`px-4 py-2 rounded-lg font-bold ${vista === 'nueva' ? 'bg-[#1B3A6B] text-white' : 'bg-white'}`}>+ Solicitud</button>
          <button onClick={() => setVista('historial')} className={`px-4 py-2 rounded-lg font-bold ${vista === 'historial' ? 'bg-[#1B3A6B] text-white' : 'bg-white'}`}>Historial</button>
        </div>

        {vista === 'home' && (
          <div className="bg-[#1B3A6B] p-8 rounded-2xl text-white">
            <h2 className="text-2xl font-bold mb-2">Bienvenido, {user?.nombre}</h2>
            <button onClick={() => setVista('nueva')} className="bg-[#F15A22] text-white font-bold py-2 px-6 rounded-lg mt-4">Nueva Solicitud</button>
          </div>
        )}
        {vista === 'nueva' && <NuevaSolicitud distribuidorId={user?.id} distribuidorNombre={user?.nombre} saldoDisponible={saldoDisponible} onCreada={() => { cargarDatos(user.id); setVista('historial'); }} />}
        {vista === 'historial' && <HistorialSolicitudes solicitudes={solicitudes} />}
      </main>
    </div>
  )
}
