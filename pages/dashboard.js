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
  const [user, setUser] = useState(null)
  const [distribuidor, setDistribuidor] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [vista, setVista] = useState('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    if (u.rol === 'admin') { router.push('/admin'); return }
    setUser(u)
    cargarDatos(u.id)
  }, [])

  async function cargarDatos(distribuidorId) {
    const { data: dist } = await supabase
      .from('distribuidores')
      .select('*')
      .eq('distribuidor_id', distribuidorId)
      .single()

    if (dist) setDistribuidor(dist)
    else {
      // Si no existe aún en Supabase, crear perfil automáticamente
      const { data: nuevo } = await supabase
        .from('distribuidores')
        .insert({ distribuidor_id: distribuidorId, saldo_disponible: 0 })
        .select()
        .single()
      setDistribuidor(nuevo)
    }

    const { data: sols } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('distribuidor_id', distribuidorId)
      .order('created_at', { ascending: false })

    setSolicitudes(sols || [])
    setLoading(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('prolub_user')
    router.push('/')
  }

  function onSolicitudCreada() {
    cargarDatos(user.id)
    setVista('historial')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#F15A22] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  )

  const saldoTotal = distribuidor?.saldo_disponible || 0
  const totalSolicitado = solicitudes
    .filter(s => ['pendiente', 'aprobado', 'ejecutado'].includes(s.estado))
    .reduce((a, s) => a + (s.monto_solicitado || 0), 0)
  const saldoDisponible = saldoTotal - totalSolicitado

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-[#1B3A6B] flex items-center justify-center bg-white">
              <svg viewBox="0 0 100 100" width="28" height="28">
                <circle cx="50" cy="50" r="48" fill="#F15A22" stroke="#1B3A6B" strokeWidth="6"/>
                <circle cx="50" cy="50" r="34" fill="white"/>
                <text x="50" y="57" textAnchor="middle" fill="#1B3A6B"
                  style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Arial Black' }}>Gulf</text>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400 leading-none">Fondo de Mercadeo</p>
              <p className="text-sm font-bold text-[#1B3A6B] leading-tight">{user?.nombre}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-[#F15A22] transition-colors font-medium">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card border-l-4 border-l-[#1B3A6B]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Saldo Asignado</p>
            <p className="text-2xl font-bold text-[#1B3A6B]">{formatCOP(saldoTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Total del período</p>
          </div>
          <div className="card border-l-4 border-l-amber-400">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">En Solicitudes</p>
            <p className="text-2xl font-bold text-amber-600">{formatCOP(totalSolicitado)}</p>
            <p className="text-xs text-gray-400 mt-1">Pendiente / Aprobado</p>
          </div>
          <div className="card border-l-4 border-l-[#F15A22]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Disponible</p>
            <p className={`text-2xl font-bold ${saldoDisponible < 0 ? 'text-red-600' : 'text-[#F15A22]'}`}>
              {formatCOP(saldoDisponible)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Para nuevas actividades</p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 max-w-sm">
          {[
            { key: 'home', label: 'Inicio' },
            { key: 'nueva', label: '+ Solicitud' },
            { key: 'historial', label: 'Mis solicitudes' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setVista(tab.key)}
              className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-all ${
                vista === tab.key ? 'bg-[#1B3A6B] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {vista === 'home' && (
          <HomeView user={user} solicitudes={solicitudes} onNueva={() => setVista('nueva')} onHistorial={() => setVista('historial')} />
        )}
        {vista === 'nueva' && (
          <NuevaSolicitud distribuidorId={user?.id} distribuidorNombre={user?.nombre} saldoDisponible={saldoDisponible} onCreada={onSolicitudCreada} />
        )}
        {vista === 'historial' && (
          <HistorialSolicitudes solicitudes={solicitudes} />
        )}
      </main>
    </div>
  )
}

function HomeView({ user, solicitudes, onNueva, onHistorial }) {
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobado').length
  const rechazadas = solicitudes.filter(s => s.estado === 'rechazado').length

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-r from-[#1B3A6B] to-[#0f2347] text-white border-0">
        <h2 className="text-xl font-bold mb-1">Bienvenido, {user?.nombre} 👋</h2>
        <p className="text-blue-200 text-sm">Gestiona tus actividades de mercadeo Gulf y haz seguimiento a tus solicitudes.</p>
        <button onClick={onNueva} className="mt-4 bg-[#F15A22] text-white font-bold text-sm py-2 px-5 rounded-lg hover:bg-[#d94e1a] transition-all">
          Crear nueva solicitud →
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Resumen</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendientes', value: pendientes, color: 'text-amber-600' },
            { label: 'Aprobadas', value: aprobadas, color: 'text-green-600' },
            { label: 'Rechazadas', value: rechazadas, color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="card text-center cursor-pointer" onClick={onHistorial}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

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
                  <span className={`status-${s.estado}`}>{s.estado}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onHistorial} className="text-[#F15A22] text-sm font-medium mt-3 hover:underline">
            Ver todas →
          </button>
        </div>
      )}
    </div>
  )
}
