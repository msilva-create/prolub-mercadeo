import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NuevaSolicitud from '../components/NuevaSolicitud'
import HistorialSolicitudes from '../components/HistorialSolicitudes'
import toast, { Toaster } from 'react-hot-toast'
 
const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)
 
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [distribuidor, setDistribuidor] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [todosLosSaldos, setTodosLosSaldos] = useState([]) // AGREGADO: Para la visual global
  const [vista, setVista] = useState('home')
  const [loading, setLoading] = useState(true)
 
  useEffect(() => {
    const stored = sessionStorage.getItem('prolub_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    if (u.rol === 'admin') { router.push('/admin'); return }
    setUser(u)
    cargarDatos(u.id)
  }, [])
 
  async function cargarDatos(distribuidorId) {
    const { data: dist } = await supabase
      .from('distribuidores')
      .select('*')
      .eq('distribuidor_id', distribuidorId)
      .single()
 
    if (dist) setDistribuidor(dist)
    else {
      const { data: nuevo } = await supabase
        .from('distribuidores')
        .insert({ distribuidor_id: distribuidorId, saldo_disponible: 0 })
        .select()
        .single()
      setDistribuidor(nuevo)
    }

    // AGREGADO: Carga todos los saldos para la visual de control de Central Gulf
    const { data: todos } = await supabase
      .from('distribuidores')
      .select('*')
      .order('distribuidor_id', { ascending: true })
    setTodosLosSaldos(todos || [])
 
    const { data: sols } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('distribuidor_id', distribuidorId)
      .order('created_at', { ascending: false })
 
    setSolicitudes(sols || [])
    setLoading(false)
  }

  // AGREGADO: Función para procesar los datos de tu imagen de Excel
  async function cargarMasivoExcel() {
    const confirmacion = confirm("¿Deseas cargar los saldos de la imagen de Excel ahora mismo?");
    if (!confirmacion) return;

    const datosExcel = [
      { id: 'cvc-servitecas', saldo: 2527484 },
      { id: 'los-lagos', saldo: 1274881 },
      { id: 'inversiones-ob', saldo: 1469740 },
      { id: 'lubricartagena', saldo: 1333789 },
      { id: 'ramos-dist', saldo: 2251964 },
      { id: 'universal', saldo: 4700000 }
    ];

    for (const item of datosExcel) {
      await supabase.from('distribuidores').upsert({ 
        distribuidor_id: item.id, 
        saldo_disponible: item.saldo 
      }, { onConflict: 'distribuidor_id' });
    }
    toast.success('Saldos cargados con éxito');
    cargarDatos(user.id);
  }
 
  function handleLogout() {
    sessionStorage.removeItem('prolub_user')
    router.push('/')
  }
 
  function onSolicitudCreada() {
    cargarDatos(user.id)
    setVista('historial')
  }
 
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#F15A22] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  )
 
  const saldoTotal = distribuidor?.saldo_disponible || 0
  const totalSolicitado = solicitudes
    .filter(s => ['pendiente', 'aprobado', 'ejecutado'].includes(s.estado))
    .reduce((a, s) => a + (s.monto_solicitado || 0), 0)
  const saldoDisponible = saldoTotal - totalSolicitado
 
  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <Toaster />
      <div className="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />
 
      {/* Header Original */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items
