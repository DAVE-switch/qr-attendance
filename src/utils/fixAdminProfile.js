// Quick fix for admin profile - run this in browser console after logging in as admin

// First, let's get the current user and create their admin profile
async function fixAdminProfile() {
  // Import supabase (adjust path if needed)
  const { supabase } = await import('../lib/supabase.js');
  
  // Get current authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Error getting user:', userError);
    return;
  }
  
  console.log('Creating admin profile for user:', user.email, 'ID:', user.id);
  
  // Create admin profile
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: 'System Administrator',
      email: user.email,
      role: 'admin',
      status: 'active'
    })
    .select();
  
  if (error) {
    console.error('Error creating admin profile:', error);
  } else {
    console.log('✅ Admin profile created successfully:', data);
    console.log('🔄 Refreshing page to apply changes...');
    // Reload page to pick up the new profile
    setTimeout(() => window.location.reload(), 1000);
  }
}

// Alternative: Direct SQL for Supabase Dashboard
// Run this in Supabase SQL Editor:
/*
INSERT INTO profiles (id, full_name, email, role, status, created_at)
SELECT 
  auth.users.id,
  'System Administrator',
  auth.users.email,
  'admin',
  'active',
  NOW()
FROM auth.users
WHERE auth.users.id = '41fe1670-3c9f-48c6-9523-8cab6d0cfbdd'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active';
*/

// Run the fix
fixAdminProfile();
