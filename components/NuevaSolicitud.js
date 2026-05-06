import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { enviarNotificacionSolicitud } from '../lib/notificaciones'
import toast from 'react-hot-toast'

const TIPOS_ACTIVIDAD = [
  { value: 'POP', label: '🏪 Material POP', desc: 'Exhibidores, afiches, pendones, cenefas' },
  { value: 'Aviso / Referencia', label: '📋 Aviso / Referencia', desc: 'Avisos exteriores e interiores' },
  { value: 'Publicidad Digital', label: '📱 Publicidad Digital', desc: 'Redes sociales, pauta digital' },
  { value: 'Evento / Activación', label: '🎪 Evento / Activación', desc: 'Demostraciones, eventos de marca' },
  { value: 'Uniformes / Dotación', label: '👕 Uniformes / Dotación', desc: 'Ropa corporativa y EPP' },
  { value: 'Capacitación', label: '📚 Capacitación', desc: 'Formación técnica y comercial' },
  { value: 'Otro', label: '📦 Otro', desc: 'Otra actividad de mercadeo' },
]

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

export default function NuevaSolicitud({ distribuidorId, distribuidorNombre, saldoDisponible, onCreada }) {
  const [form, setForm] = useState({
    tipo_actividad: '',
    descripcion: '',
    monto_solicitado: '',
    correo_contacto: '',
    observaciones: '',
  })
  const [fileSoporte, setFileSoporte] = useState(null)
  const [fileFactura, setFileFactura] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.tipo_actividad) { toast.error('Selecciona el tipo de actividad.'); return }
    if (!form.descripcion || form.descripcion.length < 20) { toast.error('La descripción debe tener al menos 20 caracteres.'); return }
    if (!form.monto_solicitado || isNaN(Number(form.monto_solicitado))) { toast.error('Ingresa un monto válido.'); return }
    if (!form.correo_contacto || !form.correo_contacto.includes('@')) { toast.error('Ingresa un correo de contacto válido.'); return }
    if (!fileSoporte) { toast.error('Adjunta el soporte de la actividad.'); return }
    if (!fileFactura) { toast.error('Adjunta la factura o cotización.'); return }

    const monto = Number(form.monto_solicitado)
    if (monto > saldoDisponible) { toast.error(`El monto supera tu saldo disponible (${formatCOP(saldoDisponible)}).`); return }

    setLoading(true)

    try {
      // 1. Subir soporte
      const soportePath = `${distribuidorId}/${Date.now()}_soporte_${fileSoporte.name}`
      const { error: err1 } = await supabase.storage.from('solicitudes-archivos').upload(soportePath, fileSoporte)
      if (err1) throw new Error('Error subiendo soporte: ' + err1.message)

      // 2. Subir factura
      const facturaPath = `${distribuidorId}/${Date.now()}_factura_${fileFactura.name}`
      const { error: err2 } = await supabase.storage.from('solicitudes-archivos').upload(facturaPath, fileFactura)
      if (err2) throw new Error('Error subiendo factura: ' + err2.message)

      const { data: urlSoporte } = supabase.storage.from('solicitudes-archivos').getPublicUrl(soportePath)
      const { data: urlFactura } = supabase.storage.from('solicitudes-archivos').getPublicUrl(facturaPath)

      // 3. Insertar solicitud
      const { data: solicitud, error: err3 } = await supabase
        .from('solicitudes')
        .insert({
          distribuidor_id: distribuidorId,
          tipo_actividad: form.tipo_actividad,
          descripcion: form.descripcion,
          monto_solicitado: monto,
          correo_contacto: form.correo_contacto,
          observaciones: form.observaciones,
          soporte_url: urlSoporte.publicUrl,
          factura_url: urlFactura.publicUrl,
          estado: 'pendiente',
        })
        .select()
        .single()

      if (err3) throw new Error('Error creando solicitud: ' + err3.message)

      // 4. Enviar correo
      try {
        await enviarNotificacionSolicitud({
          distribuidor_id: distribuidorId,
          distribuidor_nombre: distribuidorNombre,
          tipo_actividad: form.tipo_actividad,
          descripcion: form.descripcion,
          monto,
          correo_contacto: form.correo_contacto,
          numero_solicitud: solicitud.id,
          soporte_url: urlSoporte.publicUrl,
          factura_url: urlFactura.publicUrl,
        })
      } catch (emailErr) {
        console.error('Email error (non-blocking):', emailErr)
      }

      toast.success('¡Solicitud enviada! Tu equipo comercial fue notificado.')
      onCreada()
    } catch (error) {
      toast.error(error.message || 'Error al enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-[#F15A22] rounded-lg flex items-center justify-center text-white text-sm font-bold">+</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nueva solicitud de mercadeo</h2>
            <p className="text-xs text-gray-500">Saldo disponible: <span className="font-semibold text-[#F15A22]">{formatCOP(saldoDisponible)}</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Tipo */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Tipo de actividad <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIPOS_ACTIVIDAD.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => handleField('tipo_actividad', tipo.value)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all ${
                    form.tipo_actividad === tipo.value
                      ? 'border-[#F15A22] bg-orange-50 ring-1 ring-[#F15A22]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{tipo.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tipo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Descripción de la actividad <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Describe detalladamente la actividad: qué vas a hacer, dónde, cuándo y para qué..."
              value={form.descripcion}
              onChange={(e) => handleField('descripcion', e.target.value)}
              required minLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">{form.descripcion.length} / mín. 20 caracteres</p>
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Monto solicitado (COP) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                className="input-field pl-7"
                placeholder="0"
                min={1}
                value={form.monto_solicitado}
                onChange={(e) => handleField('monto_solicitado', e.target.value)}
                required
              />
            </div>
            {form.monto_solicitado && Number(form.monto_solicitado) > saldoDisponible && (
              <p className="text-xs text-red-500 mt-1">⚠ Supera tu saldo disponible</p>
            )}
          </div>

          {/* Correo de contacto */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Correo de contacto <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="tucorreo@empresa.com — para que te respondamos"
              value={form.correo_contacto}
              onChange={(e) => handleField('correo_contacto', e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">El equipo Prolub te responderá a este correo.</p>
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Observaciones adicionales
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="(Opcional) Información adicional..."
              value={form.observaciones}
              onChange={(e) => handleField('observaciones', e.target.value)}
            />
          </div>

          {/* Archivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUpload
              label="Soporte de actividad"
              hint="Cotización, propuesta o brief"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              file={fileSoporte}
              onChange={setFileSoporte}
              required
            />
            <FileUpload
              label="Factura / Cotización"
              hint="PDF o imagen de la factura"
              accept=".pdf,.jpg,.jpeg,.png"
              file={fileFactura}
              onChange={setFileFactura}
              required
            />
          </div>

          {/* Resumen */}
          {form.tipo_actividad && form.monto_solicitado && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resumen</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-700">{form.tipo_actividad}</p>
                <p className="text-base font-bold text-gray-900">{formatCOP(Number(form.monto_solicitado) || 0)}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Se notificará a tu comercial Prolub, al jefe de mercadeo y a msilva@prolub.com.co
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F15A22] text-white font-black text-sm tracking-widest uppercase py-3.5 rounded-xl hover:bg-[#d94e1a] transition-colors flex items-center justify-center gap-2 active:scale-95"
            style={{ fontFamily: 'Arial Black, sans-serif' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'ENVIANDO...' : '📤 ENVIAR SOLICITUD →'}
          </button>
        </form>
      </div>
    </div>
  )
}

function FileUpload({ label, hint, accept, file, onChange, required }) {
  const handleChange = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 10 * 1024 * 1024) { toast.error('El archivo no puede superar 10MB.'); return }
      onChange(f)
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
        file ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
      }`}>
        <input type="file" className="hidden" accept={accept} onChange={handleChange} />
        {file ? (
          <div className="text-center px-2">
            <p className="text-xs text-green-700 font-semibold">✓ {file.name.length > 24 ? file.name.substring(0, 22) + '...' : file.name}</p>
            <p className="text-xs text-green-600 mt-0.5">{(file.size / 1024).toFixed(0)} KB · Cambiar</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-2xl mb-1">📎</p>
            <p className="text-xs text-gray-600 font-medium">{label}</p>
            <p className="text-xs text-gray-400">{hint}</p>
          </div>
        )}
      </label>
    </div>
  )
}
