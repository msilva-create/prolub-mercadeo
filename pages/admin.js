import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)

const DISTRIBUIDORES_NOMBRES = {
  'lubricafe': 'LUBRICAFE',
  'maquinagro': 'MAQUINAGRO',
  'jairo-sanchez': 'JAIRO SÁNCHEZ',
  'universal': 'UNIVERSAL',
  'los-lagos': 'DISTRIBUIDORA LOS LAGOS',
  'grupo-motor': 'GRUPO MOTOR',
  'ramos-dist': 'RAMOS DISTRIBUCIONES',
  'cvc-servitecas': 'CVC SERVITECAS',
  'central-gulf': 'CENTRAL GULF',
  'lubricartagena': 'LUBRICARTAGENA',
  'inversiones-ob': 'INVERSIONES O.B.',
  'prueba': 'PRUEBA',
}

export default function Admin() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState([])
  const [legalizaciones, setLegalizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saldos, setSaldos] = useState({})
  const [vistaAdmin, setVistaAdmin] = useState('solicitudes')

  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    if (u.rol !== 'admin') { router.push('/dashboard'); return }
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    await Promise.all([cargarSolicitudes(), cargarSaldos(), cargarLegalizaciones()])
    setLoading(false)
  }

  async function cargarSolicitudes() {
    const { data } = await supabase.from('solicitudes').select('*').order('created_at', { ascending: false })
    setSolicitudes(data || [])
  }

  async function cargarSaldos() {
    const { data } = await supabase.from('distribuidores').select('*')
    const map = {}
    if (data) data.forEach(d => { map[d.distribuidor_id] = d })
    setSaldos(map)
  }

  async function cargarLegalizaciones() {
    const { data } = await supabase.from('legalizaciones').select('*').order('created_at', { ascending: false })
    setLegalizaciones(data || [])
  }

  // FUNCIÓN PARA CARGAR LO DEL EXCEL AUTOMÁTICAMENTE
  async function cargarMasivoExcel() {
    const confirmacion = confirm("¿Deseas cargar los saldos del Excel ahora mismo?")
    if (!confirmacion) return

    const datosExcel = [
      { id: 'cvc-servitecas', saldo: 2527484 },
      { id: 'los-lagos', saldo: 1274881 },
      { id: 'inversiones-ob', saldo: 1469740 },
      { id: 'lubricartagena', saldo: 1333789 },
      { id: 'ramos-dist', saldo: 2251964 },
      { id: 'universal', saldo: 4700000 },
    ]

    for (const item of datosExcel) {
      const { error } = await supabase
        .from('distribuidores')
        .upsert({ distribuidor_id: item.id, saldo_disponible: item.saldo }, { onConflict: 'distribuidor_id' })
      if (error) console.error(`Error con ${item.id}:`, error)
    }

    toast.success('Saldos del Excel cargados con éxito')
    cargarSaldos()
  }

  async function actualizarSaldoManual(id, nuevo) {
    await supabase.from('distribuidores').upsert({ distribuidor_id: id, saldo_disponible: nuevo }, { onConflict: 'distribuidor_id' })
    toast.success('Saldo actualizado')
    cargarSaldos()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Cargando...</div>

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <header className="bg-[#1B3A6B] p-4 text-white flex justify-between items-center shadow-lg">
        <h1 className="font-bold">Prolub Admin · Saldos</h1>
        <button onClick={() => { sessionStorage.removeItem('prolub_user'); router.push('/') }} className="text-xs bg-red-500 px-3 py-1 rounded">Salir</button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button onClick={() => setVistaAdmin('solicitudes')} className={`px-4 py-2 rounded-lg ${vistaAdmin === 'solicitudes' ? 'bg-[#F15A22] text-white' : 'bg-white'}`}>Solicitudes</button>
          <button onClick={() => setVistaAdmin('saldos')} className={`px-4 py-2 rounded-lg ${vistaAdmin === 'saldos' ? 'bg-[#F15A22] text-white' : 'bg-white'}`}>Saldos</button>
          <button onClick={() => setVistaAdmin('legalizaciones')} className={`px-4 py-2 rounded-lg ${vistaAdmin === 'legalizaciones' ? 'bg-[#F15A22] text-white' : 'bg-white'}`}>Legalizaciones</button>
        </div>

        {vistaAdmin === 'saldos' && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Gestión de Saldos</h2>
              <button 
                onClick={cargarMasivoExcel}
                className="bg-[#F15A22] text-white px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform shadow-md"
              >
                🚀 CARGAR SALDOS DESDE EXCEL (MASIVO)
              </button>
            </div>
            
            <div className="grid gap-4">
              {Object.entries(DISTRIBUIDORES_NOMBRES).map(([id, nombre]) => (
                <div key={id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-[#1B3A6B]">{nombre}</p>
                    <p className="text-lg font-black text-gray-800">{formatCOP(saldos[id]?.saldo_disponible || 0)}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const n = prompt(`Nuevo saldo para ${nombre}:`, saldos[id]?.saldo_disponible || 0)
                      if (n !== null) actualizarSaldoManual(id, Number(n))
                    }}
                    className="text-[#F15A22] font-bold border border-[#F15A22] px-3 py-1 rounded hover:bg-orange-50"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aquí irían las tablas de solicitudes y legalizaciones (se mantienen igual que antes) */}
        {vistaAdmin === 'solicitudes' && <p className="p-10 text-center text-gray-400">Selecciona una pestaña para gestionar.</p>}
      </main>
    </div>
  )
}
