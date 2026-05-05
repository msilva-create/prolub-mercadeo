const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const ESTADO_COLORS = {
  pendiente: 'status-pendiente',
  aprobado: 'status-aprobado',
  rechazado: 'status-rechazado',
  ejecutado: 'status-ejecutado',
}

const ESTADO_LABELS = {
  pendiente: '⏳ Pendiente',
  aprobado: '✅ Aprobado',
  rechazado: '❌ Rechazado',
  ejecutado: '🚀 Ejecutado',
}

export default function HistorialSolicitudes({ solicitudes }) {
  if (solicitudes.length === 0) {
    return (
      <div className="card text-center py-16">
        <p className="text-5xl mb-4">📂</p>
        <h3 className="text-lg font-semibold text-gray-700">No tienes solicitudes aún</h3>
        <p className="text-sm text-gray-400 mt-1">Crea tu primera solicitud de mercadeo para comenzar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Tus solicitudes ({solicitudes.length})</h2>
      </div>

      {solicitudes.map((s) => (
        <SolicitudCard key={s.id} solicitud={s} />
      ))}
    </div>
  )
}

function SolicitudCard({ solicitud: s }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{s.tipo_actividad}</span>
            <span className={ESTADO_COLORS[s.estado]}>
              {ESTADO_LABELS[s.estado] || s.estado}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{s.descripcion}</p>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>
              {new Date(s.created_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span>ID: #{String(s.id).substring(0, 8)}</span>
          </div>

          {s.observaciones_admin && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Nota del equipo Prolub:</p>
              <p className="text-xs text-blue-600">{s.observaciones_admin}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="flex gap-2 mt-3">
            {s.soporte_url && (
              <a
                href={s.soporte_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-prolub-red hover:underline font-medium flex items-center gap-1"
              >
                📎 Soporte
              </a>
            )}
            {s.factura_url && (
              <a
                href={s.factura_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-prolub-red hover:underline font-medium flex items-center gap-1"
              >
                🧾 Factura
              </a>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">{formatCOP(s.monto_solicitado)}</p>
        </div>
      </div>
    </div>
  )
}
