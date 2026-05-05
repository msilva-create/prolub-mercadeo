/**
 * Envía la notificación de nueva solicitud llamando
 * a nuestra propia API Route /api/notificar-solicitud
 * que usa Nodemailer en el servidor (sin EmailJS).
 */
export async function enviarNotificacionSolicitud({
  distribuidor,
  tipo_actividad,
  descripcion,
  monto,
  correo_comercial,
  numero_solicitud,
  soporte_url,
  factura_url,
}) {
  const res = await fetch('/api/notificar-solicitud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      distribuidor,
      tipo_actividad,
      descripcion,
      monto,
      correo_comercial,
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
