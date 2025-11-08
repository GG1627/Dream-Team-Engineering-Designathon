import { supabase, HARDCODED_PASSWORD } from './supabase'

/**
 * Register a new user with email, name, and role.
 * Password is automatically handled (hardcoded).
 */
export async function register(email: string, name: string, role: 'patient' | 'doctor' = 'patient') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: HARDCODED_PASSWORD,
      options: {
        data: {
          name,
          role
        },
        emailRedirectTo: undefined // Don't require email confirmation
      }
    })
    
    if (error) {
      // Check if it's an email confirmation error
      if (error.message?.includes('email') && error.message?.includes('confirm')) {
        return { 
          data: null, 
          error: { 
            message: 'Email confirmation is required. Please disable email confirmation in Supabase Auth settings.' 
          } 
        }
      }
      return { data: null, error }
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.session) {
      return { 
        data: null, 
        error: { 
          message: 'Please check your email to confirm your account, or disable email confirmation in Supabase Auth settings.' 
        } 
      }
    }
    
    // After registration, automatically sign them in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: HARDCODED_PASSWORD
    })
    
    if (signInError) {
      // If sign-in fails, it might be because email isn't confirmed
      if (signInError.message?.includes('email') || signInError.message?.includes('confirm')) {
        return { 
          data: null, 
          error: { 
            message: 'Please confirm your email first, or disable email confirmation in Supabase Auth settings.' 
          } 
        }
      }
      return { data: null, error: signInError }
    }
    
    return { data: signInData, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Login an existing user with email.
 * Password is automatically handled (hardcoded).
 */
export async function login(email: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: HARDCODED_PASSWORD
    })
    
    if (error) {
      // Check if it's an email confirmation error
      if (error.message?.includes('email') || error.message?.includes('confirm') || error.message?.includes('not confirmed')) {
        return { 
          data: null, 
          error: { 
            message: 'Please confirm your email first, or disable email confirmation in Supabase Auth settings.' 
          } 
        }
      }
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Sign out the current user.
 */
export async function logout() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Get the current session.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Get doctor info from approved doctors table.
 */
export async function getApprovedDoctor(email: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('email, name')
    .eq('email', email)
    .single()
  
  if (error || !data) {
    return { data: null, error: error || { message: 'Doctor not found in approved list' } }
  }
  
  return { data, error: null }
}

/**
 * Doctor login: checks if email is approved, then logs in or registers.
 * Gets doctor name from approved doctors table.
 */
export async function doctorLogin(email: string) {
  // First, check if doctor is approved
  const { data: doctorData, error: doctorError } = await getApprovedDoctor(email)
  
  if (doctorError || !doctorData) {
    return { 
      data: null, 
      error: { message: 'This email is not registered as an approved doctor. Please contact your administrator.' } 
    }
  }
  
  // Doctor is approved, get their name from the table
  const doctorName = doctorData.name || email.split('@')[0]
  
  // Try to login first
  const loginResult = await login(email)
  
  if (loginResult.error) {
    // User doesn't exist, register them with name from approved table
    return await register(email, doctorName, 'doctor')
  }
  
  // User exists, update their metadata
  await supabase.auth.updateUser({
    data: { name: doctorName, role: 'doctor' }
  })
  
  return loginResult
}

/**
 * Sync patient data to patients table (upsert - insert or update).
 * Only updates name and email, leaves other fields blank.
 */
async function syncPatientToTable(email: string, name: string) {
  try {
    const { error } = await supabase
      .from('patients')
      .upsert(
        {
          email,
          name,
          // phone and age are left null/blank
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
    
    if (error) {
      console.error('Error syncing patient to table:', error)
      // Don't throw - this is non-critical
    }
  } catch (error) {
    console.error('Error syncing patient to table:', error)
    // Don't throw - this is non-critical
  }
}

/**
 * Patient login: auto-creates account if doesn't exist.
 * Name is optional - only needed when creating new account.
 * If user exists, name is ignored.
 * Automatically adds/updates patient record in patients table.
 */
export async function patientLogin(email: string, name?: string) {
  // Try to login first
  const loginResult = await login(email)
  
  if (loginResult.error) {
    // User doesn't exist - need name to create account
    if (!name || name.trim() === '') {
      return { 
        data: null, 
        error: { 
          message: 'Account not found. Please enter your name to create a new account.' 
        } 
      }
    }
    
    // User doesn't exist, register them with provided name
    const registerResult = await register(email, name.trim(), 'patient')
    
    // Sync to patients table after successful registration
    if (registerResult.data && !registerResult.error) {
      await syncPatientToTable(email, name.trim())
    }
    
    return registerResult
  }
  
  // User exists - login successful, ignore name if provided
  // Just sync existing patient data (don't update name from form)
  const { user } = await getCurrentUser()
  const existingName = user?.user_metadata?.name || email.split('@')[0]
  
  // Sync to patients table (use existing name, not form name)
  await syncPatientToTable(email, existingName)
  
  return loginResult
}
