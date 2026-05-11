import { createClient } from '@supabase/supabase-js'

let _supabase = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    _supabase = createClient(url, key)
  }
  return _supabase
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase()
    if (!client) throw new Error('Supabase not configured')
    return client[prop]
  }
})
