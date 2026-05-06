import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(n || 0)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const {
    correo_contacto,
    distribuidor_nombre,
    tipo_actividad,
    monto,
    estado,
    nota_admin,
    numero_solicitud,
  } = req.body

  if (!correo_contacto || !estado) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  const esAprobado = estado === 'aprobado'
  const esRechazado = estado === 'rechazado'
  const esEjecutado = estado === 'ejecutado'

  const fecha = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const estadoTexto = esAprobado ? 'APROBADA ✅' : esEjecutado ? 'EJECUTADA 🚀' : 'RECHAZADA ❌'
  const colorEstado = esAprobado ? '#16A34A' : esEjecutado ? '#2563EB' : '#DC2626'
  const bgEstado = esAprobado ? '#F0FDF4' : esEjecutado ? '#EFF6FF' : '#FEF2F2'

  const mensaje = esAprobado
    ? 'Tu solicitud ha sido <strong>aprobada</strong>. El equipo Prolub Gulf coordinará contigo los próximos pasos para ejecutar la actividad.'
    : esEjecutado
    ? 'Tu solicitud ha sido <strong>ejecutada</strong>. La actividad de mercadeo ha sido procesada exitosamente.'
    : 'Tu solicitud ha sido <strong>rechazada</strong>. Puedes contactar a tu ejecutivo comercial Prolub para más información o para presentar una nueva solicitud.'

  const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#1B3A6B;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:5px;background:linear-gradient(90deg,#1B3A6B,#F15A22,#1B3A6B);"></td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="padding:24px 36px;">
            <tr>
              <td style="width:52px;height:52px;border-radius:50%;border:3px solid #F15A22;background:#fff;text-align:center;vertical-align:middle;">
                <span style="color:#1B3A6B;font-size:16px;font-weight:900;font-family:Arial Black;">Gulf</span>
              </td>
              <td style="padding-left:14px;">
                <p style="margin:0;color:#fff;font-size:17px;font-weight:800;font-family:Arial Black;font-style:italic;">GULF APOYA TU NEGOCIO</p>
                <p style="margin:2px 0 0;color:rgba(255,255,255,0.6);font-size:12px;">Fondo de Mercadeo · Actualización de solicitud</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Estado badge -->
      <tr>
        <td style="padding:28px 36px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${bgEstado};border-radius:20px;padding:6px 16px;">
                <span style="color:${colorEstado};font-size:13px;font-weight:700;">Solicitud ${estadoTexto}</span>
              </td>
            </tr>
          </table>
          <h2 style="margin:14px 0 4px;font-size:22px;color:#1B3A6B;font-weight:800;font-family:Arial Black;font-style:italic;">${distribuidor_nombre}</h2>
          <p style="margin:0;color:#6B7280;font-size:14px;">Solicitud N° <strong>${String(numero_solicitud).substring(0,8).toUpperCase()}</strong> · ${fecha}</p>
        </td>
      </tr>

      <!-- Mensaje principal -->
      <tr>
        <td style="padding:24px 36px 0;">
          <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">${mensaje}</p>
        </td>
      </tr>

      <!-- Detalle solicitud -->
      <tr>
        <td style="padding:20px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;overflow:hidden;">
            <tr style="background:#F3F4F6;">
              <td colspan="2" style="padding:10px 18px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.07em;">Tu solicitud</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;width:40%;">Tipo de actividad</td>
              <td style="padding:12px 18px;font-size:13px;color:#111827;font-weight:600;">${tipo_actividad}</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;">Monto solicitado</td>
              <td style="padding:12px 18px;font-size:16px;color:#F15A22;font-weight:700;">${formatCOP(monto)}</td>
            </tr>
            ${nota_admin ? `
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;vertical-align:top;">Nota del equipo Prolub</td>
              <td style="padding:12px 18px;font-size:13px;color:#374151;line-height:1.6;font-style:italic;">"${nota_admin}"</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 36px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B3A6B;border-radius:12px;padding:20px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;">¿Tienes preguntas?</p>
                <p style="margin:0;color:#fff;font-size:14px;">Contáctate con tu ejecutivo comercial Prolub o ingresa a la plataforma para ver el estado de tus solicitudes.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:16px 36px;border-top:1px solid #F3F4F6;text-align:center;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">© ${new Date().getFullYear()} Prolub · Gulf · Fondo de Mercadeo · Correo automático</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  const textoPlano = `
PROLUB · GULF — Actualización de tu solicitud

Distribuidor: ${distribuidor_nombre}
Solicitud N°: ${String(numero_solicitud).substring(0,8).toUpperCase()}
Estado: ${estadoTexto}
Tipo: ${tipo_actividad}
Monto: ${formatCOP(monto)}
Fecha: ${fecha}
${nota_admin ? `\nNota del equipo Prolub: ${nota_admin}` : ''}
`.trim()

  try {
    await transporter.sendMail({
      from: `"Prolub Mercadeo Gulf" <${process.env.SMTP_USER}>`,
      to: correo_contacto,
      subject: `[Prolub] Tu solicitud fue ${estadoTexto} — ${distribuidor_nombre}`,
      text: textoPlano,
      html: htmlBody,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error enviando correo respuesta:', error)
    return res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message })
  }
}
