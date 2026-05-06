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

const DISTRIBUIDORES_NOMBRES = {
  'lubricafe': 'LUBRICAFE',
  'maquinagro': 'MAQUINAGRO',
  'jairo-sanchez': 'JAIRO SÁNCHEZ',
  'universal': 'UNIVERSAL',
  'los-lagos': 'DISTRIBUIDORA LOS LAGOS',
  'grupo-motor': 'GRUPO MOTOR',
  'ramos-dist': 'RAMOS DISTRIBUCIONES',
  'cvc-servitecas': 'CVC SERVITECAS',
  'central-gulf': 'CENTRAL GULF',
  'prueba': 'PRUEBA',
}

export default function Admin() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroDist, setFiltroDist] = useState('todos')
  const [modalSolicitud, setModalSolicitud] = useState(null)
  const [saldos, setSaldos] = useState({})
  const [vistaAdmin, setVistaAdmin] = useState('solicitudes') // solicitudes | saldos

  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    if (u.rol !== 'admin') { router.push('/dashboard'); return }
    cargarSolicitudes()
    cargarSaldos()
  }, [])

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .order('created_at', { ascending: false })
    setSolicitudes(data || [])
    setLoading(false)
  }

  async function cargarSaldos() {
    const { data } = await supabase.from('distribuidores').select('*')
    const map = {}
    if (data) data.forEach(d => { map[d.distribuidor_id] = d })
    setSaldos(map)
  }

  async function actualizarEstado(id, nuevoEstado, nota, solicitud) {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: nuevoEstado, observaciones_admin: nota })
      .eq('id', id)

    if (error) { toast.error('Error actualizando estado'); return }

    // Enviar correo al distribuidor si tiene correo de contacto
    if (solicitud.correo_contacto && (nuevoEstado === 'aprobado' || nuevoEstado === 'rechazado' || nuevoEstado === 'ejecutado')) {
      try {
        await fetch('/api/notificar-respuesta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo_contacto: solicitud.correo_contacto,
            distribuidor_nombre: DISTRIBUIDORES_NOMBRES[solicitud.distribuidor_id] || solicitud.distribuidor_id,
            tipo_actividad: solicitud.tipo_actividad,
            monto: solicitud.monto_solicitado,
            estado: nuevoEstado,
            nota_admin: nota,
            numero_solicitud: solicitud.id,
          }),
        })
        toast.success(`Estado actualizado y correo enviado a ${solicitud.correo_contacto}`)
      } catch (e) {
        toast.success('Estado actualizado (correo no enviado)')
      }
    } else {
      toast.success('Estado actualizado')
    }

    setModalSolicitud(null)
    cargarSolicitudes()
  }

  async function actualizarSaldo(distribuidorId, nuevoSaldo) {
    const exists = saldos[distribuidorId]
    if (exists) {
      await supabase.from('distribuidores').update({ saldo_disponible: nuevoSaldo }).eq('distribuidor_id', distribuidorId)
    } else {
      await supabase.from('distribuidores').insert({ distribuidor_id: distribuidorId, saldo_disponible: nuevoSaldo })
    }
    toast.success('Saldo actualizado')
    cargarSaldos()
  }

  function handleLogout() {
    sessionStorage.removeItem('prolub_user')
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#F15A22] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const solicitudesFiltradas = solicitudes.filter(s => {
    const passEstado = filtroEstado === 'todos' || s.estado === filtroEstado
    const passDist = filtroDist === 'todos' || s.distribuidor_id === filtroDist
    return passEstado && passDist
  })

  const totalPendiente = solicitudes.filter(s => s.estado === 'pendiente').reduce((a, s) => a + s.monto_solicitado, 0)
  const totalAprobado = solicitudes.filter(s => s.estado === 'aprobado').reduce((a, s) => a + s.monto_solicitado, 0)
  const totalEjecutado = solicitudes.filter(s => s.estado === 'ejecutado').reduce((a, s) => a + s.monto_solicitado, 0)

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />

      {/* Header */}
      <header className="bg-[#1B3A6B] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-[#F15A22] flex items-center justify-center bg-white">
              <svg viewBox="0 0 100 100" width="28" height="28">
                <circle cx="50" cy="50" r="48" fill="#F15A22" stroke="#1B3A6B" strokeWidth="6"/>
                <circle cx="50" cy="50" r="34" fill="white"/>
                <text x="50" y="57" textAnchor="middle" fill="#1B3A6B"
                  style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Arial Black' }}>Gulf</text>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-400 leading-none">Panel Administrativo</p>
              <p className="text-sm font-bold text-white leading-tight">Prolub · Fondo de Mercadeo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#F15A22] text-white text-xs font-bold px-2.5 py-1 rounded-full">ADMIN</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pendientes', value: solicitudes.filter(s => s.estado === 'pendiente').length, sub: formatCOP(totalPendiente), color: 'border-l-amber-400' },
            { label: 'Aprobadas', value: solicitudes.filter(s => s.estado === 'aprobado').length, sub: formatCOP(totalAprobado), color: 'border-l-green-500' },
            { label: 'Ejecutadas', value: solicitudes.filter(s => s.estado === 'ejecutado').length, sub: formatCOP(totalEjecutado), color: 'border-l-blue-500' },
            { label: 'Total solicitudes', value: solicitudes.length, sub: 'historial completo', color: 'border-l-[#F15A22]' },
          ].map((k, i) => (
            <div key={i} className={`card border-l-4 ${k.color}`}>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{k.label}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 max-w-xs">
          {[
            { key: 'solicitudes', label: 'Solicitudes' },
            { key: 'saldos', label: 'Saldos' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setVistaAdmin(t.key)}
              className={`flex-1 text-sm py-2 px-4 rounded-lg font-medium transition-all ${
                vistaAdmin === t.key ? 'bg-[#1B3A6B] text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {vistaAdmin === 'solicitudes' && (
          <div>
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select className="input-field max-w-xs text-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="ejecutado">Ejecutado</option>
              </select>
              <select className="input-field max-w-xs text-sm" value={filtroDist} onChange={e => setFiltroDist(e.target.value)}>
                <option value="todos">Todos los distribuidores</option>
                {Object.entries(DISTRIBUIDORES_NOMBRES).map(([id, nombre]) => (
                  <option key={id} value={id}>{nombre}</option>
                ))}
              </select>
            </div>

            {/* Tabla */}
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Distribuidor', 'Tipo', 'Monto', 'Correo contacto', 'Estado', 'Fecha', 'Acción'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {solicitudesFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">No hay solicitudes</td></tr>
                    ) : solicitudesFiltradas.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1B3A6B] text-sm">{DISTRIBUIDORES_NOMBRES[s.distribuidor_id] || s.distribuidor_id}</td>
                        <td className="px-4 py-3 text-gray-700">{s.tipo_actividad}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(s.monto_solicitado)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.correo_contacto || '—'}</td>
                        <td className="px-4 py-3"><span className={ESTADO_COLORS[s.estado]}>{s.estado}</span></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setModalSolicitud(s)} className="text-xs text-[#F15A22] hover:underline font-medium">
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

        {vistaAdmin === 'saldos' && (
          <SaldosPanel saldos={saldos} onActualizar={actualizarSaldo} />
        )}
      </main>

      {modalSolicitud && (
        <ModalGestion
          solicitud={modalSolicitud}
          onClose={() => setModalSolicitud(null)}
          onActualizar={actualizarEstado}
        />
      )}
    </div>
  )
}

function ModalGestion({ solicitud: s, onClose, onActualizar }) {
  const [estado, setEstado] = useState(s.estado)
  const [nota, setNota] = useState(s.observaciones_admin || '')
  const [saving, setSaving] = useState(false)

  async function handleGuardar() {
    setSaving(true)
    await onActualizar(s.id, estado, nota, s)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Gestionar solicitud</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Detalle</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400 text-xs">Distribuidor</p><p className="font-semibold text-[#1B3A6B]">{s.distribuidor_id?.toUpperCase()}</p></div>
              <div><p className="text-gray-400 text-xs">Tipo</p><p className="font-medium">{s.tipo_actividad}</p></div>
              <div><p className="text-gray-400 text-xs">Monto</p><p className="font-bold text-[#F15A22]">{formatCOP(s.monto_solicitado)}</p></div>
              <div><p className="text-gray-400 text-xs">Correo contacto</p><p className="font-medium text-xs">{s.correo_contacto || '—'}</p></div>
            </div>
            <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">{s.descripcion}</p>
          </div>

          {/* Archivos */}
          <div className="flex gap-3">
            {s.soporte_url && (
              <a href={s.soporte_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 border border-gray-200 rounded-lg text-sm text-[#1B3A6B] hover:bg-blue-50 font-medium transition-colors">
                📎 Ver soporte
              </a>
            )}
            {s.factura_url && (
              <a href={s.factura_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 border border-gray-200 rounded-lg text-sm text-[#F15A22] hover:bg-orange-50 font-medium transition-colors">
                🧾 Ver factura
              </a>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Actualizar estado</label>
            <div className="grid grid-cols-4 gap-2">
              {['pendiente', 'aprobado', 'rechazado', 'ejecutado'].map(e => (
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

          {/* Nota */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Nota para el distribuidor
              {s.correo_contacto && <span className="text-xs text-gray-400 font-normal ml-1">(se enviará al correo de contacto)</span>}
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Motivo de aprobación / rechazo, instrucciones..."
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>

          {s.correo_contacto && (estado === 'aprobado' || estado === 'rechazado' || estado === 'ejecutado') && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-semibold">📧 Se enviará correo automático a:</p>
              <p className="text-xs text-blue-600 mt-0.5">{s.correo_contacto}</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleGuardar} disabled={saving} className="flex-1 bg-[#F15A22] text-white font-bold py-2.5 px-6 rounded-lg hover:bg-[#d94e1a] transition-all flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar y notificar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SaldosPanel({ saldos, onActualizar }) {
  const DISTRIBUIDORES_NOMBRES = {
    'central-gulf': 'CENTRAL GULF',
    'lubricafe': 'LUBRICAFE',
    'maquinagro': 'MAQUINAGRO',
    'jairo-sanchez': 'JAIRO SÁNCHEZ',
    'universal': 'UNIVERSAL',
    'los-lagos': 'DISTRIBUIDORA LOS LAGOS',
    'grupo-motor': 'GRUPO MOTOR',
    'ramos-dist': 'RAMOS DISTRIBUCIONES',
    'cvc-servitecas': 'CVC SERVITECAS',
    'prueba': 'PRUEBA',
  }

  const [editando, setEditando] = useState(null)
  const [nuevoSaldo, setNuevoSaldo] = useState('')

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['Distribuidor', 'Saldo asignado', 'Acción'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Object.entries(DISTRIBUIDORES_NOMBRES).map(([id, nombre]) => (
            <tr key={id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-[#1B3A6B]">{nombre}</td>
              <td className="px-4 py-3">
                {editando === id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input-field py-1 text-sm w-36"
                      value={nuevoSaldo}
                      onChange={e => setNuevoSaldo(e.target.value)}
                      placeholder={saldos[id]?.saldo_disponible || 0}
                      autoFocus
                    />
                    <button onClick={async () => { await onActualizar(id, Number(nuevoSaldo)); setEditando(null) }}
                      className="text-green-600 font-bold text-lg">✓</button>
                    <button onClick={() => setEditando(null)} className="text-gray-400 text-lg">×</button>
                  </div>
                ) : (
                  <span className="font-bold text-gray-900">
                    {formatCOP(saldos[id]?.saldo_disponible || 0)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {editando !== id && (
                  <button onClick={() => { setEditando(id); setNuevoSaldo(saldos[id]?.saldo_disponible || '') }}
                    className="text-xs text-[#F15A22] hover:underline font-medium">
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
