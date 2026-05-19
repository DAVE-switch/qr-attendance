import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      setProfile(data ?? null)
    } catch (err) {
      console.error('fetchProfile error:', err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_UP') return
        setUser(session?.user ?? null)
        if (session?.user) {
          setLoading(true)
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

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
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const { error: pErr } = await supabase.from('profiles').insert({
      id: data.user.id, full_name: fullName, email,
      role: 'student', index_number: indexNumber,
      phone: phone || null, status: 'active',
    })
    if (pErr) throw pErr
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setLoading(false)
  }

  const registerLecturer = async ({ email, password, fullName, lecturerId }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const { error: pErr } = await supabase.from('profiles').insert({
      id: data.user.id, full_name: fullName, email,
      role: 'lecturer', lecturer_id: lecturerId, status: 'pending',
    })
    if (pErr) throw pErr
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setLoading(false)
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
