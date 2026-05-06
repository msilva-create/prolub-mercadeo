import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const emailStyle = `
  body { margin:0; padding:0; background:#F0F2F5; font-family:'Helvetica Neue',Arial,sans-serif; }
  .wrap { background:#F0F2F5; padding:40px 0; }
  .card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); max-width:600px; margin:0 auto; }
  .header { background:#1B3A6B; padding:0; }
  .bar { height:5px; background:linear-gradient(90deg,#1B3A6B,#F15A22,#1B3A6B); }
  .header-inner { padding:24px 36px; display:flex; align-items:center; gap:14px; }
  .logo { width:52px; height:52px; border-radius:50%; border:3px solid #F15A22; background:#fff; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:#1B3A6B; font-family:Arial Black; }
  .header-text p { margin:0; }
  .title { color:#fff; font-size:17px; font-weight:800; font-style:italic; font-family:Arial Black; }
  .subtitle { color:rgba(255,255,255,0.6); font-size:12px; }
  .body { padding:28px 36px; }
  .badge { background:#FEF3C7; border-radius:20px; padding:5px 14px; display:inline-block; color:#92400E; font-size:12px; font-weight:700; margin-bottom:14px; }
  .dist-name { font-size:22px; color:#1B3A6B; font-weight:800; font-family:Arial Black; font-style:italic; margin:0 0 4px; }
  .sol-num { color:#6B7280; font-size:14px; margin:0 0 20px; }
  .table { width:100%; border-collapse:collapse; background:#F9FAFB; border-radius:12px; overflow:hidden; }
  .table-head td { padding:10px 18px; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.07em; background:#F3F4F6; }
  .table-row td { padding:12px 18px; font-size:13px; border-top:1px solid #E5E7EB; }
  .label { color:#6B7280; width:40%; }
  .value { color:#111827; font-weight:600; }
  .amount { color:#F15A22; font-size:16px; font-weight:700; }
  .email-link { color:#F15A22; }
  .files { margin:20px 0; }
  .files p { font-size:12px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.07em; margin:0 0 10px; }
  .file-btn { display:inline-block; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; text-decoration:none; margin-right:8px; }
  .cta { background:#1B3A6B; border-radius:12px; padding:20px 24px; margin-top:20px; }
  .cta p { margin:0; color:#fff; font-size:14px; }
  .cta .cta-label { color:rgba(255,255,255,0.6); font-size:12px; margin-bottom:4px !important; }
  .footer { padding:16px 36px; border-top:1px solid #F3F4F6; text-align:center; }
  .footer p { color:#9CA3AF; font-size:12px; margin:0; }
`

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

  const correo_comercial = COMERCIALES[distribuidor_id] || 'msilva@prolub.com.co'
  const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const solNum = String(numero_solicitud).substring(0, 8).toUpperCase()

  const archivosHtml = (soporte_url || factura_url) ? `
    <div class="files">
      <p>Archivos adjuntos</p>
      ${soporte_url ? `<a href="${soporte_url}" class="file-btn" style="background:#EEF2FF;color:#1B3A6B;">📎 Ver soporte</a>` : ''}
      ${factura_url ? `<a href="${factura_url}" class="file-btn" style="background:#FFF0EA;color:#F15A22;">🧾 Ver factura</a>` : ''}
    </div>` : ''

  // Email para el equipo (yo + jefe + comercial)
  const htmlEquipo = `
  <html><head><style>${emailStyle}</style></head>
  <body><div class="wrap"><div class="card">
    <div class="header">
      <div class="bar"></div>
      <div class="header-inner">
        <div class="logo">Gulf</div>
        <div class="header-text">
          <p class="title">PROLUB ACELERA TU CRECIMIENTO</p>
          <p class="subtitle">${distribuidor_nombre} · Nueva Solicitud de Mercadeo</p>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="badge">⏳ NUEVA SOLICITUD PENDIENTE DE APROBACIÓN</div>
      <p class="dist-name">${distribuidor_nombre}</p>
      <p class="sol-num">Solicitud N° <strong>${solNum}</strong> · ${fecha}</p>
      <table class="table">
        <tr class="table-head"><td colspan="2">Detalle de la solicitud</td></tr>
        <tr class="table-row"><td class="label">Tipo de actividad</td><td class="value">${tipo_actividad}</td></tr>
        <tr class="table-row"><td class="label">Monto solicitado</td><td class="amount">${formatCOP(monto)}</td></tr>
        <tr class="table-row"><td class="label">Descripción</td><td class="value" style="line-height:1.6;">${descripcion}</td></tr>
        <tr class="table-row"><td class="label">Correo contacto</td><td class="value"><a href="mailto:${correo_contacto}" class="email-link">${correo_contacto}</a></td></tr>
      </table>
      ${archivosHtml}
      <div class="cta">
        <p class="cta-label">Acción requerida</p>
        <p>Ingresa al panel admin para aprobar o rechazar esta solicitud.</p>
      </div>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} Prolub · Gulf · Fondo de Mercadeo · Correo automático</p></div>
  </div></div></body></html>`

  // Email de confirmación para el distribuidor
  const htmlDistribuidor = `
  <html><head><style>${emailStyle}</style></head>
  <body><div class="wrap"><div class="card">
    <div class="header">
      <div class="bar"></div>
      <div class="header-inner">
        <div class="logo">Gulf</div>
        <div class="header-text">
          <p class="title">PROLUB ACELERA TU CRECIMIENTO</p>
          <p class="subtitle">Confirmación de solicitud recibida</p>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="badge" style="background:#DBEAFE;color:#1e40af;">📋 SOLICITUD EN EVALUACIÓN</div>
      <p class="dist-name">${distribuidor_nombre}</p>
      <p class="sol-num">Solicitud N° <strong>${solNum}</strong> · ${fecha}</p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Hemos recibido tu solicitud de mercadeo. Nuestro equipo la está evaluando y te notificaremos la decisión a este correo a la brevedad.
      </p>
      <table class="table">
        <tr class="table-head"><td colspan="2">Resumen de tu solicitud</td></tr>
        <tr class="table-row"><td class="label">Tipo de actividad</td><td class="value">${tipo_actividad}</td></tr>
        <tr class="table-row"><td class="label">Monto solicitado</td><td class="amount">${formatCOP(monto)}</td></tr>
        <tr class="table-row"><td class="label">Descripción</td><td class="value" style="line-height:1.6;">${descripcion}</td></tr>
      </table>
      <div class="cta">
        <p class="cta-label">¿Tienes preguntas?</p>
        <p>Contacta a tu ejecutivo comercial Prolub o ingresa a la plataforma para hacer seguimiento.</p>
      </div>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} Prolub · Gulf · Fondo de Mercadeo · Correo automático</p></div>
  </div></div></body></html>`

  try {
    // Enviar al equipo
    await resend.emails.send({
      from: 'Prolub Mercadeo <onboarding@resend.dev>',
      to: ['msilva@prolub.com.co', 'cgil@prolub.com.co', correo_comercial].filter(Boolean),
      reply_to: correo_contacto,
      subject: `Prolub Acelera tu Crecimiento · ${distribuidor_nombre} — Nueva solicitud`,
      html: htmlEquipo,
    })

    // Enviar confirmación al distribuidor
    if (correo_contacto) {
      await resend.emails.send({
        from: 'Prolub Mercadeo <onboarding@resend.dev>',
        to: [correo_contacto],
        subject: `Tu solicitud está siendo evaluada — ${distribuidor_nombre}`,
        html: htmlDistribuidor,
      })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error enviando correo:', error)
    return res.status(500).json({ error: 'Error al enviar el correo', detalle: error.message })
  }
}
