import nodemailer from 'nodemailer'

// Mapa de distribuidores → correo comercial asignado
const COMERCIALES = {
  'lubricafe':       'grodriguez@prolub.com.co',
  'maquinagro':      'cblanco@prolub.com.co',
  'jairo-sanchez':   'cblanco@prolub.com.co',
  'universal':       'oramirez@prolub.com.co',
  'los-lagos':       'cblanco@prolub.com.co',
  'grupo-motor':     'oramirez@prolub.com.co',
  'ramos-dist':      'grodriguez@prolub.com.co',
  'cvc-servitecas':  'cblanco@prolub.com.co',
  'central-gulf':    'grodriguez@prolub.com.co',
  'prueba':          'msilva@prolub.com.co',
}

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
    distribuidor_id,
    distribuidor_nombre,
    tipo_actividad,
    descripcion,
    monto,
    correo_contacto,
    numero_solicitud,
    soporte_url,
    factura_url,
  } = req.body

  if (!distribuidor_nombre || !tipo_actividad || !monto) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  const correo_comercial = COMERCIALES[distribuidor_id] || ''
  const fecha = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Destinatarios: comercial + msilva (yo) + cgil (jefe)
  const destinatarios = [
    correo_comercial,
    'msilva@prolub.com.co',
    'cgil@prolub.com.co',
  ].filter(Boolean)

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
            <tr>
              <td style="height:5px;background:linear-gradient(90deg,#1B3A6B,#F15A22,#1B3A6B);"></td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="padding:24px 36px;">
            <tr>
              <td style="width:52px;height:52px;border-radius:50%;border:3px solid #F15A22;background:#fff;text-align:center;vertical-align:middle;">
                <span style="color:#1B3A6B;font-size:18px;font-weight:900;font-family:Arial Black;">Gulf</span>
              </td>
              <td style="padding-left:14px;">
                <p style="margin:0;color:#fff;font-size:17px;font-weight:800;font-family:Arial Black;font-style:italic;">PROLUB ACELERA TU CRECIMIENTO</p>
                <p style="margin:2px 0 0;color:rgba(255,255,255,0.6);font-size:12px;">${distribuidor_nombre} · Nueva Solicitud de Mercadeo</p>
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
                <span style="color:#92400E;font-size:12px;font-weight:700;">⏳ NUEVA SOLICITUD PENDIENTE DE APROBACIÓN</span>
              </td>
            </tr>
          </table>
          <h2 style="margin:14px 0 4px;font-size:22px;color:#1B3A6B;font-weight:800;font-family:Arial Black;font-style:italic;">${distribuidor_nombre}</h2>
          <p style="margin:0;color:#6B7280;font-size:14px;">Solicitud N° <strong>${String(numero_solicitud).substring(0,8).toUpperCase()}</strong> · ${fecha}</p>
        </td>
      </tr>

      <!-- Details -->
      <tr>
        <td style="padding:24px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:12px;overflow:hidden;">
            <tr style="background:#F3F4F6;">
              <td colspan="2" style="padding:10px 18px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.07em;">Detalle de la solicitud</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;width:40%;">Tipo de actividad</td>
              <td style="padding:12px 18px;font-size:13px;color:#111827;font-weight:600;">${tipo_actividad}</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;">Monto solicitado</td>
              <td style="padding:12px 18px;font-size:16px;color:#F15A22;font-weight:700;">${formatCOP(monto)}</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;vertical-align:top;">Descripción</td>
              <td style="padding:12px 18px;font-size:13px;color:#374151;line-height:1.6;">${descripcion}</td>
            </tr>
            <tr style="border-top:1px solid #E5E7EB;">
              <td style="padding:12px 18px;font-size:13px;color:#6B7280;">Correo de contacto</td>
              <td style="padding:12px 18px;font-size:13px;color:#1B3A6B;font-weight:600;">
                <a href="mailto:${correo_contacto}" style="color:#F15A22;">${correo_contacto}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Attachments -->
      ${soporte_url || factura_url ? `
      <tr>
        <td style="padding:0 36px 24px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.07em;">Archivos adjuntos</p>
          <table cellpadding="0" cellspacing="0"><tr>
            ${soporte_url ? `<td style="padding-right:8px;"><a href="${soporte_url}" style="display:inline-block;background:#EEF2FF;color:#1B3A6B;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;text-decoration:none;">📎 Ver soporte</a></td>` : ''}
            ${factura_url ? `<td><a href="${factura_url}" style="display:inline-block;background:#FFF0EA;color:#F15A22;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;text-decoration:none;">🧾 Ver factura</a></td>` : ''}
          </tr></table>
        </td>
      </tr>` : ''}

      <!-- CTA -->
      <tr>
        <td style="padding:0 36px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B3A6B;border-radius:12px;padding:20px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;">Acción requerida</p>
                <p style="margin:0;color:#fff;font-size:14px;font-weight:500;">Ingresa al panel admin para aprobar o rechazar esta solicitud. Puedes responder directamente al correo de contacto del distribuidor.</p>
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
PROLUB · GULF — Nueva solicitud de fondo de mercadeo

Distribuidor: ${distribuidor_nombre}
Tipo: ${tipo_actividad}
Monto: ${formatCOP(monto)}
Fecha: ${fecha}
N° Solicitud: ${String(numero_solicitud).substring(0,8).toUpperCase()}
Correo de contacto: ${correo_contacto}

Descripción:
${descripcion}

${soporte_url ? `Soporte: ${soporte_url}` : ''}
${factura_url ? `Factura: ${factura_url}` : ''}
`.trim()

  try {
    await transporter.sendMail({
      from: `"Prolub Mercadeo Gulf" <${process.env.SMTP_USER}>`,
      to: destinatarios.join(', '),
      replyTo: correo_contacto, // responder va directo al distribuidor
      subject: `Prolub Acelera tu Crecimiento · ${distribuidor_nombre} — Nueva solicitud de mercadeo`,
      text: textoPlano,
      html: htmlBody,
    })

    return res.status(200).json({ ok: true, destinatarios })
  } catch (error) {
    console.error('Error enviando correo:', error)
    return res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message })
  }
}
