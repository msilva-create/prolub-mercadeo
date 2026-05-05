import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const ESTADO_COLORS = {
  pendiente: 'status-pendiente',
  aprobado: 'status-aprobado',
  rechazado: 'status-rechazado',
  ejecutado: 'status-ejecutado',
}

export default function Admin() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState([])
  const [distribuidores, setDistribuidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroDistribuidor, setFiltroDistribuidor] = useState('todos')
  const [vista, setVista] = useState('solicitudes') // solicitudes | distribuidores
  const [modalSolicitud, setModalSolicitud] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { data: perfil } = await supabase
      .from('distribuidores')
      .select('rol')
      .eq('auth_user_id', session.user.id)
      .single()

    if (perfil?.rol !== 'admin') { router.push('/dashboard'); return }

    await Promise.all([cargarSolicitudes(), cargarDistribuidores()])
    setLoading(false)
  }

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('solicitudes')
      .select('*, distribuidores(razon_social, correo_comercial, ciudad)')
      .order('created_at', { ascending: false })
    setSolicitudes(data || [])
  }

  async function cargarDistribuidores() {
    const { data } = await supabase
      .from('distribuidores')
      .select('*')
      .neq('rol', 'admin')
      .order('razon_social')
    setDistribuidores(data || [])
  }

  async function actualizarEstado(id, nuevoEstado, obs) {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado, observaciones_admin: obs })
      .eq('id', id)

    if (error) { toast.error('Error actualizando estado'); return }
    toast.success('Estado actualizado')
    setModalSolicitud(null)
    cargarSolicitudes()
  }

  async function actualizarSaldo(distribuidorId, nuevoSaldo) {
    const { error } = await supabase
      .from('distribuidores')
      .update({ saldo_disponible: nuevoSaldo })
      .eq('id', distribuidorId)

    if (error) { toast.error('Error actualizando saldo'); return }
    toast.success('Saldo actualizado')
    cargarDistribuidores()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-prolub-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const passEstado = filtroEstado === 'todos' || s.estado === filtroEstado
    const passDist = filtroDistribuidor === 'todos' || s.distribuidor_id === filtroDistribuidor
    return passEstado && passDist
  })

  const totalPendiente = solicitudes.filter(s => s.estado === 'pendiente').reduce((a, s) => a + s.monto_solicitado, 0)
  const totalAprobado = solicitudes.filter(s => s.estado === 'aprobado').reduce((a, s) => a + s.monto_solicitado, 0)
  const totalEjecutado = solicitudes.filter(s => s.estado === 'ejecutado').reduce((a, s) => a + s.monto_solicitado, 0)

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {/* Header */}
      <header className="bg-[#1A1A2E] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-prolub-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Barlow Condensed' }}>P</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 leading-none">Panel Administrativo</p>
              <p className="text-sm font-semibold text-white leading-tight">Prolub · Fondo de Mercadeo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-prolub-red text-white text-xs font-bold px-2.5 py-1 rounded-full">ADMIN</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Solicitudes pendientes', value: solicitudes.filter(s => s.estado === 'pendiente').length, sub: formatCOP(totalPendiente), color: 'border-l-amber-400' },
            { label: 'Aprobadas', value: solicitudes.filter(s => s.estado === 'aprobado').length, sub: formatCOP(totalAprobado), color: 'border-l-green-500' },
            { label: 'Ejecutadas', value: solicitudes.filter(s => s.estado === 'ejecutado').length, sub: formatCOP(totalEjecutado), color: 'border-l-blue-500' },
            { label: 'Distribuidores activos', value: distribuidores.length, sub: 'con fondo asignado', color: 'border-l-prolub-red' },
          ].map((kpi, i) => (
            <div key={i} className={`card border-l-4 ${kpi.color}`}>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 max-w-xs">
          {[
            { key: 'solicitudes', label: 'Solicitudes' },
            { key: 'distribuidores', label: 'Distribuidores' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setVista(t.key)}
              className={`flex-1 text-sm py-2 px-4 rounded-lg font-medium transition-all ${
                vista === t.key ? 'bg-[#1A1A2E] text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {vista === 'solicitudes' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                className="input-field max-w-xs text-sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="ejecutado">Ejecutado</option>
              </select>

              <select
                className="input-field max-w-xs text-sm"
                value={filtroDistribuidor}
                onChange={(e) => setFiltroDistribuidor(e.target.value)}
              >
                <option value="todos">Todos los distribuidores</option>
                {distribuidores.map((d) => (
                  <option key={d.id} value={d.id}>{d.razon_social}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distribuidor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {solicitudesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">
                          No hay solicitudes con estos filtros
                        </td>
                      </tr>
                    ) : solicitudesFiltradas.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{s.distribuidores?.razon_social}</p>
                          <p className="text-xs text-gray-400">{s.distribuidores?.ciudad}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.tipo_actividad}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(s.monto_solicitado)}</td>
                        <td className="px-4 py-3">
                          <span className={ESTADO_COLORS[s.estado]}>{s.estado}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setModalSolicitud(s)}
                            className="text-xs text-prolub-red hover:underline font-medium"
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {vista === 'distribuidores' && (
          <DistribuidoresPanel distribuidores={distribuidores} onActualizarSaldo={actualizarSaldo} />
        )}
      </main>

      {/* Modal gestión */}
      {modalSolicitud && (
        <ModalGestionSolicitud
          solicitud={modalSolicitud}
          onClose={() => setModalSolicitud(null)}
          onActualizar={actualizarEstado}
        />
      )}
    </div>
  )
}

function ModalGestionSolicitud({ solicitud: s, onClose, onActualizar }) {
  const [estado, setEstado] = useState(s.estado)
  const [obs, setObs] = useState(s.observaciones_admin || '')
  const [saving, setSaving] = useState(false)

  async function handleGuardar() {
    setSaving(true)
    await onActualizar(s.id, estado, obs)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Gestionar solicitud</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Detalles</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-400">Distribuidor:</span><p className="font-medium">{s.distribuidores?.razon_social}</p></div>
              <div><span className="text-gray-400">Tipo:</span><p className="font-medium">{s.tipo_actividad}</p></div>
              <div><span className="text-gray-400">Monto:</span><p className="font-bold text-gray-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(s.monto_solicitado)}</p></div>
              <div><span className="text-gray-400">Fecha:</span><p className="font-medium">{new Date(s.created_at).toLocaleDateString('es-CO')}</p></div>
            </div>
            <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">{s.descripcion}</p>
          </div>

          {/* Archivos */}
          <div className="flex gap-3">
            {s.soporte_url && (
              <a href={s.soporte_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 border border-gray-200 rounded-lg text-sm text-prolub-red hover:bg-red-50 font-medium transition-colors">
                📎 Ver soporte
              </a>
            )}
            {s.factura_url && (
              <a href={s.factura_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 border border-gray-200 rounded-lg text-sm text-prolub-red hover:bg-red-50 font-medium transition-colors">
                🧾 Ver factura
              </a>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Actualizar estado</label>
            <div className="grid grid-cols-4 gap-2">
              {['pendiente', 'aprobado', 'rechazado', 'ejecutado'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEstado(e)}
                  className={`py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                    estado === e
                      ? e === 'aprobado' || e === 'ejecutado' ? 'bg-green-600 text-white border-green-600'
                        : e === 'rechazado' ? 'bg-red-600 text-white border-red-600'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nota para el distribuidor</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Motivo de aprobación / rechazo, instrucciones..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGuardar} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DistribuidoresPanel({ distribuidores, onActualizarSaldo }) {
  const [editandoId, setEditandoId] = useState(null)
  const [nuevoSaldo, setNuevoSaldo] = useState('')

  const handleGuardar = async (id) => {
    if (!nuevoSaldo || isNaN(Number(nuevoSaldo))) return
    await onActualizarSaldo(id, Number(nuevoSaldo))
    setEditandoId(null)
    setNuevoSaldo('')
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distribuidor</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciudad</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comercial</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo asignado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {distribuidores.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-900">{d.razon_social}</td>
              <td className="px-4 py-3 text-gray-500">{d.ciudad || '—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{d.correo_comercial || '—'}</td>
              <td className="px-4 py-3">
                {editandoId === d.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input-field py-1 text-sm w-36"
                      value={nuevoSaldo}
                      onChange={(e) => setNuevoSaldo(e.target.value)}
                      placeholder={d.saldo_disponible}
                      autoFocus
                    />
                    <button onClick={() => handleGuardar(d.id)} className="text-green-600 hover:text-green-700 font-bold text-lg">✓</button>
                    <button onClick={() => setEditandoId(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                  </div>
                ) : (
                  <span className="font-bold text-gray-900">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(d.saldo_disponible || 0)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {editandoId !== d.id && (
                  <button
                    onClick={() => { setEditandoId(d.id); setNuevoSaldo(d.saldo_disponible || '') }}
                    className="text-xs text-prolub-red hover:underline font-medium"
                  >
                    Editar saldo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
