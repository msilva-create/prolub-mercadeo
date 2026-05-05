import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Credenciales inválidas. Verifica tu usuario y contraseña.')
      setLoading(false)
      return
    }

    // Check if admin
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2d0a14]">
      <div className="w-full max-w-md px-4">

        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-prolub-red rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>P</span>
          </div>
          <h1 className="text-white text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>
            PROLUB
          </h1>
          <p className="text-gray-400 text-sm mt-1">Fondo de Mercadeo · Distribuidores</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="distribuidor@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Problemas para ingresar? Contacta a tu ejecutivo comercial Prolub.
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Prolub · Acelera tu Crecimiento
        </p>
      </div>
    </div>
  )
}
