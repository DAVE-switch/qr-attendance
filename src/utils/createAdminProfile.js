// This script can be used to create an admin profile in Supabase
// Run this in the browser console or Supabase SQL Editor

// Method 1: Using Supabase Client (run in browser console)
import { supabase } from '../lib/supabase'

async function createAdminProfile() {
  // First, get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('No authenticated user found. Please login first.')
    return
  }
  
  console.log('Creating admin profile for user:', user.email)
  
  // Create or update the profile with admin role
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: 'System Administrator',
      email: user.email,
      role: 'admin',
      status: 'active'
    })
    .select()
  
  if (error) {
    console.error('Error creating admin profile:', error)
  } else {
    console.log('Admin profile created successfully:', data)
    // Refresh the page to reload the profile
    window.location.reload()
  }
}

// Method 2: SQL for Supabase SQL Editor
/*
-- Run this in the Supabase SQL Editor
-- Replace 'your-email@example.com' with the actual admin email

INSERT INTO profiles (id, full_name, email, role, status, created_at, updated_at)
SELECT 
  auth.users.id,
  'System Administrator',
  auth.users.email,
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users
WHERE auth.users.email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = NOW;
*/

export { createAdminProfile }
