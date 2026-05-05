import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const DISTRIBUIDORES = [
  { nombre: 'CENTRAL GULF',            email: 'central.gulf@prolub.com' },
  { nombre: 'LUBRICAFE',               email: 'lubricafe@prolub.com' },
  { nombre: 'MAQUINAGRO',              email: 'maquinagro@prolub.com' },
  { nombre: 'JAIRO SÁNCHEZ',           email: 'jairosanchez@prolub.com' },
  { nombre: 'UNIVERSAL',               email: 'universal@prolub.com' },
  { nombre: 'DISTRIBUIDORA LOS LAGOS', email: 'loslagos@prolub.com' },
  { nombre: 'GRUPO MOTOR',             email: 'grupomotor@prolub.com' },
  { nombre: 'RAMOS DISTRIBUCIONES',    email: 'ramosdist@prolub.com' },
  { nombre: 'PRUEBA',                  email: 'prueba@prolub.com' },
  { nombre: 'CVC SERVITECAS',          email: 'cvcservitecas@prolub.com' },
]

export default function Login() {
  const router = useRouter()
  const [step, setStep] = useState('select')
  const [distribuidor, setDistribuidor] = useState(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelect = (dist) => {
    setDistribuidor(dist)
    setStep('password')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: distribuidor.email,
      password,
    })

    if (error) {
      toast.error('Contraseña incorrecta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase
      .from('distribuidores')
      .select('rol')
      .eq('auth_user_id', data.user.id)
      .single()

    if (perfil?.rol === 'admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-[#1B3A6B] bg-white shadow-lg mb-5">
            <svg viewBox="0 0 100 100" width="72" height="72">
              <circle cx="50" cy="50" r="48" fill="#F15A22" stroke="#1B3A6B" strokeWidth="4"/>
              <circle cx="50" cy="50" r="34" fill="white"/>
              <text x="50" y="57" textAnchor="middle" fill="#1B3A6B"
                style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Arial Black, sans-serif' }}>
                Gulf
              </text>
            </svg>
          </div>

          {step === 'select' ? (
            <>
              <h1 className="text-3xl font-black text-[#1B3A6B] italic"
                style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.01em' }}>
                GULF APOYA TU NEGOCIO
              </h1>
              <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
                Gestiona tu fondo de mercadeo y activa actividades que impulsan tus ventas Gulf.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-[#1B3A6B] italic"
                style={{ fontFamily: 'Arial Black, sans-serif' }}>
                {distribuidor.nombre}
              </h1>
              <p className="text-gray-400 text-sm mt-1">Ingresa tu contraseña para continuar</p>
            </>
          )}
        </div>

        {step === 'select' ? (
          <div className="w-full max-w-2xl">
            <p className="text-center text-xs font-bold text-[#1B3A6B] tracking-widest uppercase mb-5">
              Selecciona tu distribuidora para comenzar
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DISTRIBUIDORES.map((dist) => (
                <button
                  key={dist.email}
                  onClick={() => handleSelect(dist)}
                  className="group bg-white border-2 border-gray-100 rounded-xl p-4 text-left hover:border-[#F15A22] hover:shadow-md transition-all duration-200 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FFF0EA] transition-colors">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" stroke="#1B3A6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1B3A6B] leading-tight group-hover:text-[#F15A22] transition-colors">
                        {dist.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-semibold tracking-wider">INGRESAR →</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-sm">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#1B3A6B] uppercase tracking-widest block mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#F15A22] transition-colors text-base"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F15A22] text-white font-black text-sm tracking-widest uppercase py-3.5 rounded-xl hover:bg-[#d94e1a] transition-colors flex items-center justify-center gap-2 active:scale-95"
                  style={{ fontFamily: 'Arial Black, sans-serif' }}
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading ? 'INGRESANDO...' : 'INGRESAR A LA PLATAFORMA →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('select'); setPassword('') }}
                  className="w-full text-xs text-gray-400 hover:text-[#1B3A6B] transition-colors py-2 font-medium"
                >
                  ← Volver a selección
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-300 mt-10 tracking-widest uppercase">
          Programa de Mercadeo Prolub · Gulf
        </p>
        <p className="text-xs text-gray-200 mt-1">Plataforma de Fondo de Mercadeo v1.0</p>
      </div>

      <div className="h-1.5 bg-gradient-to-r from-[#1B3A6B] via-[#F15A22] to-[#1B3A6B]" />
    </div>
  )
}
