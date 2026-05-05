import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NuevaSolicitud from '../components/NuevaSolicitud'
import HistorialSolicitudes from '../components/HistorialSolicitudes'
import toast from 'react-hot-toast'

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

export default function Dashboard() {
  const router = useRouter()
  const [distribuidor, setDistribuidor] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [vista, setVista] = useState('home') // home | nueva | historial
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }

    const { data: dist, error } = await supabase
      .from('distribuidores')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single()

    if (error || !dist) {
      toast.error('No se encontró perfil de distribuidor.')
      router.push('/')
      return
    }

    // Redirect admins
    if (dist.rol === 'admin') {
      router.push('/admin')
      return
    }

    setDistribuidor(dist)
    await cargarSolicitudes(dist.id)
    setLoading(false)
  }

  async function cargarSolicitudes(distribuidorId) {
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('distribuidor_id', distribuidorId)
      .order('created_at', { ascending: false })

    setSolicitudes(data || [])
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function onSolicitudCreada() {
    cargarSolicitudes(distribuidor.id)
    setVista('historial')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-prolub-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  const saldoTotal = distribuidor?.saldo_disponible || 0
  const totalSolicitado = solicitudes
    .filter((s) => ['pendiente', 'aprobado', 'ejecutado'].includes(s.estado))
    .reduce((acc, s) => acc + (s.monto_solicitado || 0), 0)
  const saldoDisponible = saldoTotal - totalSolicitado

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-prolub-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>P</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 leading-none">Fondo de Mercadeo</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{distribuidor?.razon_social}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-prolub-red transition-colors font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card border-l-4 border-l-prolub-red">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Saldo Asignado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCOP(saldoTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Total del período</p>
          </div>
          <div className="card border-l-4 border-l-amber-400">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">En Solicitudes</p>
            <p className="text-2xl font-bold text-amber-600">{formatCOP(totalSolicitado)}</p>
            <p className="text-xs text-gray-400 mt-1">Pendiente / Aprobado</p>
          </div>
          <div className="card border-l-4 border-l-green-500">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Disponible</p>
            <p className={`text-2xl font-bold ${saldoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCOP(saldoDisponible)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Para nuevas actividades</p>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 max-w-sm">
          {[
            { key: 'home', label: 'Inicio' },
            { key: 'nueva', label: '+ Nueva solicitud' },
            { key: 'historial', label: 'Mis solicitudes' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setVista(tab.key)}
              className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-all ${
                vista === tab.key
                  ? 'bg-prolub-red text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {vista === 'home' && (
          <HomeView
            distribuidor={distribuidor}
            solicitudes={solicitudes}
            onNueva={() => setVista('nueva')}
            onHistorial={() => setVista('historial')}
          />
        )}

        {vista === 'nueva' && (
          <NuevaSolicitud
            distribuidor={distribuidor}
            saldoDisponible={saldoDisponible}
            onCreada={onSolicitudCreada}
          />
        )}

        {vista === 'historial' && (
          <HistorialSolicitudes solicitudes={solicitudes} />
        )}
      </main>
    </div>
  )
}

function HomeView({ distribuidor, solicitudes, onNueva, onHistorial }) {
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobado').length
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado').length

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-[#C41E3A] to-[#8B0000] text-white border-0">
        <h2 className="text-xl font-bold mb-1">
          Bienvenido, {distribuidor?.razon_social} 👋
        </h2>
        <p className="text-red-100 text-sm">
          Aquí puedes gestionar tus actividades de mercadeo Prolub y hacer seguimiento a tus solicitudes.
        </p>
        <button
          onClick={onNueva}
          className="mt-4 bg-white text-prolub-red font-semibold text-sm py-2 px-5 rounded-lg hover:bg-red-50 transition-all"
        >
          Crear nueva solicitud
        </button>
      </div>

      {/* Status summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Resumen de solicitudes</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center cursor-pointer hover:border-amber-300 transition-colors" onClick={onHistorial}>
            <p className="text-3xl font-bold text-amber-600">{pendientes}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Pendientes</p>
          </div>
          <div className="card text-center cursor-pointer hover:border-green-300 transition-colors" onClick={onHistorial}>
            <p className="text-3xl font-bold text-green-600">{aprobadas}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Aprobadas</p>
          </div>
          <div className="card text-center cursor-pointer hover:border-red-300 transition-colors" onClick={onHistorial}>
            <p className="text-3xl font-bold text-red-500">{rechazadas}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Rechazadas</p>
          </div>
        </div>
      </div>

      {/* Recent */}
      {solicitudes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Últimas solicitudes</h3>
          <div className="space-y-2">
            {solicitudes.slice(0, 3).map((s) => (
              <div key={s.id} className="card flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.tipo_actividad}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(s.monto_solicitado)}
                  </p>
                  <span className={`status-${s.estado}`}>{s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onHistorial} className="text-prolub-red text-sm font-medium mt-3 hover:underline">
            Ver todas las solicitudes →
          </button>
        </div>
      )}
    </div>
  )
}
