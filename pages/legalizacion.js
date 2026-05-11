import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const EFECTIVIDAD_OPCIONES = [
  { value: 'muy_alta', label: '🚀 Muy alta — Superó expectativas' },
  { value: 'alta', label: '✅ Alta — Cumplió el objetivo' },
  { value: 'media', label: '📊 Media — Resultados parciales' },
  { value: 'baja', label: '📉 Baja — Por debajo del objetivo' },
]

export default function Legalizacion() {
  const router = useRouter()
  const { solicitud_id } = router.query
  const [user, setUser] = useState(null)
  const [solicitud, setSolicitud] = useState(null)
  const [legalizacion, setLegalizacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    galones_impactados: '',
    efectividad: '',
    observaciones: '',
  })
  const [fileFactura, setFileFactura] = useState(null)
  const [fotos, setFotos] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    setUser(u)
    if (solicitud_id) cargarSolicitud(solicitud_id, u.id)
  }, [solicitud_id])

  async function cargarSolicitud(id, distribuidorId) {
    const { data: sol } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('id', id)
      .eq('distribuidor_id', distribuidorId)
      .single()

    if (!sol) { toast.error('Solicitud no encontrada'); router.push('/dashboard'); return }
    setSolicitud(sol)

    // Check if already legalized
    const { data: leg } = await supabase
      .from('legalizaciones')
      .select('*')
      .eq('solicitud_id', id)
      .single()

    if (leg) setLegalizacion(leg)
    setLoading(false)
  }

  const handleField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleFotos = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + fotos.length > 5) { toast.error('Máximo 5 fotos.'); return }
    setFotos(prev => [...prev, ...files])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.galones_impactados) { toast.error('Ingresa los galones impactados.'); return }
    if (!form.efectividad) { toast.error('Selecciona la efectividad de la actividad.'); return }
    if (!fileFactura) { toast.error('Adjunta la factura de la actividad.'); return }

    setSaving(true)
    try {
      // Upload factura
      const facturaPath = `${user.id}/leg_${Date.now()}_factura_${fileFactura.name}`
      const { error: err1 } = await supabase.storage.from('solicitudes-archivos').upload(facturaPath, fileFactura)
      if (err1) throw new Error('Error subiendo factura')
      const { data: urlFactura } = supabase.storage.from('solicitudes-archivos').getPublicUrl(facturaPath)

      // Upload fotos
      const fotosUrls = []
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i]
        const fotoPath = `${user.id}/leg_${Date.now()}_foto${i}_${foto.name}`
        const { error: errFoto } = await supabase.storage.from('solicitudes-archivos').upload(fotoPath, foto)
        if (!errFoto) {
          const { data: urlFoto } = supabase.storage.from('solicitudes-archivos').getPublicUrl(fotoPath)
          fotosUrls.push(urlFoto.publicUrl)
        }
      }

      // Insert legalizacion
      const { error: err2 } = await supabase.from('legalizaciones').insert({
        solicitud_id: solicitud.id,
        distribuidor_id: user.id,
        factura_url: urlFactura.publicUrl,
        galones_impactados: Number(form.galones_impactados),
        registro_fotografico_urls: fotosUrls,
        efectividad: form.efectividad,
        observaciones: form.observaciones,
        estado: 'pendiente',
      })
      if (err2) throw new Error('Error guardando legalización')

      // Update solicitud estado
      await supabase.from('solicitudes').update({ estado: 'en_legalizacion' }).eq('id', solicitud.id)

      // Enviar notificación
      try {
        await fetch('/api/notificar-legalizacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distribuidor_id: user.id,
            distribuidor_nombre: user.nombre,
            tipo_actividad: solicitud.tipo_actividad,
            monto: solicitud.monto_solicitado,
            galones_impactados: form.galones_impactados,
            efectividad: EFECTIVIDAD_OPCIONES.find(o => o.value === form.efectividad)?.label,
            factura_url: urlFactura.publicUrl,
            fotos_urls: fotosUrls,
            numero_solicitud: solicitud.id,
            correo_contacto: solicitud.correo_contacto,
          }),
        })
      } catch (e) { console.error('Email error:', e) }

      toast.success('¡Legalización enviada exitosamente!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error.message || 'Error al enviar la legalización.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-[#F15A22] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://i.postimg.cc/SxWkYzGz/Gulf-Oil-logo-svg.png" alt="Gulf" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-xs text-gray-400 leading-none">Legalización de actividad</p>
              <p className="text-sm font-bold text-[#1B3A6B] leading-tight">{user?.nombre}</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-400 hover:text-[#F15A22] transition-colors">
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Solicitud info */}
        {solicitud && (
          <div className="card border-l-4 border-l-[#1B3A6B] mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Solicitud aprobada</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1B3A6B] text-lg">{solicitud.tipo_actividad}</p>
                <p className="text-xs text-gray-400 mt-1">{solicitud.descripcion}</p>
              </div>
              <p className="text-xl font-bold text-[#F15A22]">{formatCOP(solicitud.monto_solicitado)}</p>
            </div>
          </div>
        )}

        {legalizacion ? (
          <div className="card text-center py-12">
            <p className="text-5xl mb-4">✅</p>
            <h3 className="text-lg font-bold text-[#1B3A6B]">Legalización ya enviada</h3>
            <p className="text-sm text-gray-400 mt-2">Esta actividad ya fue legalizada. El equipo Prolub está revisando la información.</p>
            <span className={`inline-block mt-4 px-3 py-1 rounded-full text-xs font-bold ${
              legalizacion.estado === 'aprobado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {legalizacion.estado === 'aprobado' ? '✅ Aprobada' : '⏳ En revisión'}
            </span>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#1B3A6B] rounded-lg flex items-center justify-center text-white text-sm font-bold">L</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Legalización de actividad</h2>
                <p className="text-xs text-gray-500">Sube los soportes para proceder con el pago</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Galones */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  Galones impactados <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="¿Cuántos galones logró evacuar con esta actividad?"
                  min={0}
                  value={form.galones_impactados}
                  onChange={e => handleField('galones_impactados', e.target.value)}
                  required
                />
              </div>

              {/* Efectividad */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Efectividad de la actividad <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EFECTIVIDAD_OPCIONES.map(op => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => handleField('efectividad', op.value)}
                      className={`text-left px-4 py-3 rounded-lg border transition-all ${
                        form.efectividad === op.value
                          ? 'border-[#1B3A6B] bg-blue-50 ring-1 ring-[#1B3A6B]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">{op.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  Descripción de resultados
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Describe los resultados obtenidos, aprendizajes, impacto en ventas..."
                  value={form.observaciones}
                  onChange={e => handleField('observaciones', e.target.value)}
                />
              </div>

              {/* Factura */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  Factura de la actividad <span className="text-red-500">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  fileFactura ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                    const f = e.target.files?.[0]
                    if (f && f.size <= 10 * 1024 * 1024) setFileFactura(f)
                    else toast.error('Máximo 10MB')
                  }} />
                  {fileFactura ? (
                    <div className="text-center px-2">
                      <p className="text-xs text-green-700 font-semibold">✓ {fileFactura.name}</p>
                      <p className="text-xs text-green-600">{(fileFactura.size / 1024).toFixed(0)} KB · Cambiar</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-2xl mb-1">🧾</p>
                      <p className="text-xs text-gray-600 font-medium">Adjuntar factura</p>
                      <p className="text-xs text-gray-400">PDF o imagen</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Fotos */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                  Registro fotográfico <span className="text-gray-400 font-normal">(hasta 5 fotos)</span>
                </label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png" multiple onChange={handleFotos} />
                  {fotos.length > 0 ? (
                    <div className="text-center px-2">
                      <p className="text-xs text-green-700 font-semibold">✓ {fotos.length} foto(s) seleccionada(s)</p>
                      <p className="text-xs text-green-600">Clic para agregar más</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-2xl mb-1">📷</p>
                      <p className="text-xs text-gray-600 font-medium">Adjuntar fotos del evento</p>
                      <p className="text-xs text-gray-400">JPG o PNG</p>
                    </div>
                  )}
                </label>
                {fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fotos.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                        <span className="text-xs text-blue-700 font-medium">{f.name.substring(0, 20)}</span>
                        <button type="button" onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                          className="text-blue-400 hover:text-red-500 text-xs ml-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#1B3A6B] text-white font-black text-sm tracking-widest uppercase py-3.5 rounded-xl hover:bg-[#0f2347] transition-colors flex items-center justify-center gap-2 active:scale-95"
                style={{ fontFamily: 'Arial Black, sans-serif' }}
              >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'ENVIANDO...' : '📤 ENVIAR LEGALIZACIÓN →'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
