import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip on SIGNED_UP — we handle profile creation manually in register functions
        if (event === 'SIGNED_UP') return

        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (error) throw error
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const registerStudent = async ({ email, password, fullName, indexNumber, phone }) => {
    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // 2. Insert profile
    const { error: pErr } = await supabase.from('profiles').insert({
      id:           data.user.id,
      full_name:    fullName,
      email,
      role:         'student',
      index_number: indexNumber,
      phone:        phone || null,
      status:       'active',
    })
    if (pErr) throw pErr

    // 3. Sign out so they go to login page cleanly
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  const registerLecturer = async ({ email, password, fullName, lecturerId }) => {
    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // 2. Insert profile
    const { error: pErr } = await supabase.from('profiles').insert({
      id:          data.user.id,
      full_name:   fullName,
      email,
      role:        'lecturer',
      lecturer_id: lecturerId,
      status:      'pending',
    })
    if (pErr) throw pErr

    // 3. Sign out so they go to login page cleanly
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, logout, fetchProfile,
      registerStudent, registerLecturer,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
