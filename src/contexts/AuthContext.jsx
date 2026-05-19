import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileCache = new Map() // Simple in-memory cache

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
    const startTime = performance.now()
    try {
      // Check cache first
      if (profileCache.has(userId)) {
        const cachedProfile = profileCache.get(userId)
        setProfile(cachedProfile)
        console.log(`Profile fetch (cache) took ${(performance.now() - startTime).toFixed(2)}ms`)
        setLoading(false)
        return
      }

      // Try with a longer timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, index_number, lecturer_id, phone, status')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found
          console.warn('Profile not found for user:', userId)
          setProfile(null)
        } else {
          throw error
        }
        return
      }
      
      // Cache the result
      profileCache.set(userId, data)
      setProfile(data)
      
      // Log performance metrics
      const endTime = performance.now()
      console.log(`Profile fetch took ${(endTime - startTime).toFixed(2)}ms`)
      
    } catch (error) {
      console.error('Profile fetch error:', error)
      
      // Handle different error types
      if (error.name === 'AbortError') {
        console.warn('Profile fetch aborted due to timeout, trying fallback...')
        // Try a simpler query without timeout
        try {
          const { data, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, index_number, status')
            .eq('id', userId)
            .single()
          
          if (!fallbackError && data) {
            profileCache.set(userId, data)
            setProfile(data)
            console.log('Profile fetch fallback successful')
          } else {
            setProfile(null)
          }
        } catch (fallbackErr) {
          console.error('Profile fetch fallback failed:', fallbackErr)
          setProfile(null)
        }
      } else {
        // Other errors - set profile to null
        setProfile(null)
      }
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
