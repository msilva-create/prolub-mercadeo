import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const emailStyle = `
  body { margin:0; padding:0; background:#F0F2F5; font-family:'Helvetica Neue',Arial,sans-serif; }
  .wrap { background:#F0F2F5; padding:40px 0; }
  .card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); max-width:600px; margin:0 auto; }
  .header { background:#1B3A6B; }
  .bar { height:5px; background:linear-gradient(90deg,#1B3A6B,#F15A22,#1B3A6B); }
  .header-inner { padding:24px 36px; display:flex; align-items:center; gap:14px; }
  .logo { width:52px; height:52px; border-radius:50%; border:3px solid #F15A22; background:#fff; text-align:center; line-height:52px; font-size:16px; font-weight:900; color:#1B3A6B; font-family:Arial Black; }
  .title { color:#fff; font-size:17px; font-weight:800; font-style:italic; font-family:Arial Black; margin:0; }
  .subtitle { color:rgba(255,255,255,0.6); font-size:12px; margin:2px 0 0; }
  .body { padding:28px 36px; }
  .dist-name { font-size:22px; color:#1B3A6B; font-weight:800; font-family:Arial Black; font-style:italic; margin:14px 0 4px; }
  .sol-num { color:#6B7280; font-size:14px; margin:0 0 20px; }
  .msg { font-size:15px; color:#374151; line-height:1.7; margin:0 0 20px; }
  .table { width:100%; border-collapse:collapse; background:#F9FAFB; border-radius:12px; overflow:hidden; }
  .table-head td { padding:10px 18px; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.07em; background:#F3F4F6; }
  .table-row td { padding:12px 18px; font-size:13px; border-top:1px solid #E5E7EB; }
  .label { color:#6B7280; width:40%; }
  .value { color:#111827; font-weight:600; }
  .amount { color:#F15A22; font-size:16px; font-weight:700; }
  .nota { font-style:italic; color:#374151; }
  .cta { background:#1B3A6B; border-radius:12px; padding:20px 24px; margin-top:20px; }
  .cta-label { color:rgba(255,255,255,0.6); font-size:12px; margin:0 0 4px; }
  .cta-text { color:#fff; font-size:14px; margin:0; }
  .footer { padding:16px 36px; border-top:1px solid #F3F4F6; text-align:center; }
  .footer p { color:#9CA3AF; font-size:12px; margin:0; }
`

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

  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const solNum = String(numero_solicitud).substring(0, 8).toUpperCase()

  const esAprobado = estado === 'aprobado'
  const esRechazado = estado === 'rechazado'
  const esEjecutado = estado === 'ejecutado'

  const estadoTexto = esAprobado ? 'APROBADA ✅' : esEjecutado ? 'EJECUTADA 🚀' : 'RECHAZADA ❌'
  const badgeColor = esAprobado ? '#F0FDF4' : esEjecutado ? '#EFF6FF' : '#FEF2F2'
  const badgeText = esAprobado ? '#16A34A' : esEjecutado ? '#2563EB' : '#DC2626'

  const mensaje = esAprobado
    ? 'Tu solicitud ha sido <strong>aprobada</strong>. El equipo Prolub Gulf coordinará contigo los próximos pasos.'
    : esEjecutado
    ? 'Tu solicitud ha sido <strong>ejecutada</strong>. La actividad de mercadeo fue procesada exitosamente.'
    : 'Tu solicitud ha sido <strong>rechazada</strong>. Puedes contactar a tu ejecutivo comercial para más información.'

  const html = `
  <html><head><style>${emailStyle}</style></head>
  <body><div class="wrap"><div class="card">
    <div class="header">
      <div class="bar"></div>
      <div class="header-inner">
        <div class="logo">Gulf</div>
        <div>
          <p class="title">PROLUB ACELERA TU CRECIMIENTO</p>
          <p class="subtitle">Actualización de tu solicitud de mercadeo</p>
        </div>
      </div>
    </div>
    <div class="body">
      <div style="background:${badgeColor};border-radius:20px;padding:5px 14px;display:inline-block;color:${badgeText};font-size:13px;font-weight:700;">
        Solicitud ${estadoTexto}
      </div>
      <p class="dist-name">${distribuidor_nombre}</p>
      <p class="sol-num">Solicitud N° <strong>${solNum}</strong> · ${fecha}</p>
      <p class="msg">${mensaje}</p>
      <table class="table">
        <tr class="table-head"><td colspan="2">Tu solicitud</td></tr>
        <tr class="table-row"><td class="label">Tipo de actividad</td><td class="value">${tipo_actividad}</td></tr>
        <tr class="table-row"><td class="label">Monto solicitado</td><td class="amount">${formatCOP(monto)}</td></tr>
        ${nota_admin ? `<tr class="table-row"><td class="label">Nota del equipo</td><td class="nota">"${nota_admin}"</td></tr>` : ''}
      </table>
      <div class="cta">
        <p class="cta-label">¿Tienes preguntas?</p>
        <p class="cta-text">Contacta a tu ejecutivo comercial Prolub o ingresa a la plataforma.</p>
      </div>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} Prolub · Gulf · Fondo de Mercadeo</p></div>
  </div></div></body></html>`

  try {
    await resend.emails.send({
      from: 'Prolub Mercadeo <onboarding@resend.dev>',
      to: [correo_contacto],
      subject: `Tu solicitud fue ${estadoTexto} — ${distribuidor_nombre}`,
      html,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error enviando correo respuesta:', error)
    return res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message })
  }
}
