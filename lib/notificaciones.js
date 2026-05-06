export async function enviarNotificacionSolicitud({
  distribuidor_id,
  distribuidor_nombre,
  tipo_actividad,
  descripcion,
  monto,
  correo_contacto,
  numero_solicitud,
  soporte_url,
  factura_url,
}) {
  const res = await fetch('/api/notificar-solicitud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      distribuidor_id,
      distribuidor_nombre,
      tipo_actividad,
      descripcion,
      monto,
      correo_contacto,
      numero_solicitud,
      soporte_url,
      factura_url,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al enviar notificación')
  }

  return res.json()
}
