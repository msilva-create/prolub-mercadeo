import nodemailer from 'nodemailer'

// Transporter se crea una vez (reutilizable)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // smtp.gmail.com | smtp.office365.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER,     // tu correo remitente
    pass: process.env.SMTP_PASS,     // contraseña de aplicación (no la normal)
  },
})

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n || 0)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const {
    distribuidor,
    tipo_actividad,
    descripcion,
    monto,
    correo_comercial,
    numero_solicitud,
    soporte_url,
    factura_url,
  } = req.body

  if (!distribuidor || !tipo_actividad || !monto) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  // Armar lista de destinatarios
  const destinatarios = [
    process.env.EMAIL_ADMIN,
    process.env.EMAIL_JEFE,
    correo_comercial,
  ].filter(Boolean)

  if (destinatarios.length === 0) {
    return res.status(400).json({ error: 'No hay destinatarios configurados' })
  }

  const fecha = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nueva Solicitud Prolub</title>
</head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#C41E3A;padding:28px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:800;line-height:44px;">P</span>
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.04em;">PROLUB</p>
                    <p style="margin:2px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Fondo de Mercadeo · Distribuidores</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td style="padding:28px 36px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FEF3C7;border-radius:20px;padding:5px 14px;">
                    <span style="color:#92400E;font-size:12px;font-weight:700;letter-spacing:0.05em;">⏳ NUEVA SOLICITUD PENDIENTE</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:14px 0 4px;font-size:22px;color:#1A1A2E;font-weight:700;">${distribuidor}</h1>
              <p style="margin:0;color:#6B7280;font-size:14px;">Solicitud N° <strong>${String(numero_solicitud).substring(0, 8).toUpperCase()}</strong> · ${fecha}</p>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="padding:24px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;overflow:hidden;">
                <tr style="background:#F3F4F6;">
                  <td style="padding:10px 18px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.07em;" colspan="2">Detalle de la solicitud</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:12px 18px;font-size:13px;color:#6B7280;width:40%;">Tipo de actividad</td>
                  <td style="padding:12px 18px;font-size:13px;color:#111827;font-weight:600;">${tipo_actividad}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:12px 18px;font-size:13px;color:#6B7280;">Monto solicitado</td>
                  <td style="padding:12px 18px;font-size:16px;color:#C41E3A;font-weight:700;">${formatCOP(monto)}</td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:12px 18px;font-size:13px;color:#6B7280;vertical-align:top;">Descripción</td>
                  <td style="padding:12px 18px;font-size:13px;color:#374151;line-height:1.6;">${descripcion}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Attachments -->
          ${soporte_url || factura_url ? `
          <tr>
            <td style="padding:0 36px 24px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.07em;">Archivos adjuntos</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  ${soporte_url ? `<td style="padding-right:8px;"><a href="${soporte_url}" style="display:inline-block;background:#FEE2E2;color:#C41E3A;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;text-decoration:none;">📎 Ver soporte</a></td>` : ''}
                  ${factura_url ? `<td><a href="${factura_url}" style="display:inline-block;background:#FEE2E2;color:#C41E3A;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;text-decoration:none;">🧾 Ver factura</a></td>` : ''}
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding:0 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1A1A2E;border-radius:12px;padding:20px 24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;">Acción requerida</p>
                    <p style="margin:0;color:#ffffff;font-size:14px;font-weight:500;">Ingresa al panel admin para aprobar o rechazar esta solicitud.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px;border-top:1px solid #F3F4F6;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© ${new Date().getFullYear()} Prolub · Acelera tu Crecimiento · Este correo es automático</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const textoPlano = `
PROLUB - Nueva solicitud de fondo de mercadeo

Distribuidor: ${distribuidor}
Tipo: ${tipo_actividad}
Monto: ${formatCOP(monto)}
Fecha: ${fecha}
N° Solicitud: ${String(numero_solicitud).substring(0, 8).toUpperCase()}

Descripción:
${descripcion}

${soporte_url ? `Soporte: ${soporte_url}` : ''}
${factura_url ? `Factura: ${factura_url}` : ''}

Ingresa al panel admin para gestionar esta solicitud.
  `.trim()

  try {
    await transporter.sendMail({
      from: `"Prolub Mercadeo" <${process.env.SMTP_USER}>`,
      to: destinatarios.join(', '),
      subject: `[Prolub] Nueva solicitud — ${distribuidor} · ${tipo_actividad}`,
      text: textoPlano,
      html: htmlBody,
    })

    return res.status(200).json({ ok: true, destinatarios })
  } catch (error) {
    console.error('Error enviando correo:', error)
    return res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message })
  }
}
