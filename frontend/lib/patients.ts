import { supabase } from './supabase'

export interface PatientData {
  id?: string
  email: string
  name: string
  phone?: string | null
  age?: number | null
  created_at?: string
  updated_at?: string
}

export interface MedicalHistory {
  id?: string
  patient_id?: string
  // Basic Health Info
  blood_type?: string | null
  height_inches?: number | null
  weight_lbs?: number | null
  // Allergies & Medications
  allergies?: string | null
  current_medications?: string | null
  // Medical History
  chronic_conditions?: string | null
  past_surgeries?: string | null
  previous_hospitalizations?: string | null
  // Lifestyle
  smoking_status?: string | null
  alcohol_use?: string | null
  exercise_frequency?: string | null
  // Family & Mental Health
  family_history?: string | null
  mental_health_history?: string | null
  // Immunizations
  immunization_history?: string | null
  // Emergency Contact
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  // Insurance
  insurance_provider?: string | null
  insurance_policy_number?: string | null
  // Other
  other_notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface Appointment {
  id?: string
  patient_id?: string
  doctor_id?: string | null
  appointment_date: string
  appointment_time: string
  location?: string | null
  reason?: string | null
  transcript?: string | null
  soap_notes?: string | null
  notes?: string | null
  status?: string
  created_at?: string
  updated_at?: string
}

/**
 * Get patient data from patients table by email
 */
export async function getPatientData(email: string) {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as PatientData, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Update patient data in patients table
 */
export async function updatePatientData(email: string, updates: Partial<PatientData>) {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('email', email)
      .select()
      .single()
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as PatientData, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get medical history for a patient by patient_id
 */
export async function getMedicalHistory(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', patientId)
      .single()
    
    if (error) {
      // If no record exists, that's okay - return null
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      return { data: null, error }
    }
    
    return { data: data as MedicalHistory, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get medical history for a patient by email (looks up patient_id first)
 */
export async function getMedicalHistoryByEmail(email: string) {
  try {
    // First get patient data to get patient_id
    const { data: patient, error: patientError } = await getPatientData(email)
    
    if (patientError || !patient || !patient.id) {
      return { data: null, error: patientError || { message: 'Patient not found' } }
    }
    
    return await getMedicalHistory(patient.id)
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Upsert medical history for a patient
 */
export async function upsertMedicalHistory(patientId: string, history: Partial<MedicalHistory>) {
  try {
    const { data, error } = await supabase
      .from('medical_history')
      .upsert(
        {
          patient_id: patientId,
          ...history
        },
        {
          onConflict: 'patient_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single()
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as MedicalHistory, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Upsert medical history by email (looks up patient_id first)
 */
export async function upsertMedicalHistoryByEmail(email: string, history: Partial<MedicalHistory>) {
  try {
    // First get patient data to get patient_id
    const { data: patient, error: patientError } = await getPatientData(email)
    
    if (patientError || !patient || !patient.id) {
      return { data: null, error: patientError || { message: 'Patient not found' } }
    }
    
    return await upsertMedicalHistory(patient.id, history)
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get all appointments for a patient by patient_id
 */
export async function getAppointments(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as Appointment[], error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get all appointments (for doctors - no patient filter)
 */
export async function getAllAppointments(limit?: number) {
  try {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as Appointment[], error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get upcoming appointments (for doctors - all patients)
 */
export async function getAllUpcomingAppointments(limit?: number) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    let query = supabase
      .from('appointments')
      .select('*')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as Appointment[], error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get patient data by patient_id
 */
export async function getPatientDataById(patientId: string) {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as PatientData, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get all appointments for a patient by email (looks up patient_id first)
 */
export async function getAppointmentsByEmail(email: string) {
  try {
    // First get patient data to get patient_id
    const { data: patient, error: patientError } = await getPatientData(email)
    
    if (patientError || !patient || !patient.id) {
      return { data: null, error: patientError || { message: 'Patient not found' } }
    }
    
    return await getAppointments(patient.id)
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Get upcoming appointments (appointments with date >= today)
 */
export async function getUpcomingAppointmentsByEmail(email: string, limit?: number) {
  try {
    const { data: patient, error: patientError } = await getPatientData(email)
    
    if (patientError || !patient || !patient.id) {
      return { data: null, error: patientError || { message: 'Patient not found' } }
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patient.id)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { data: null, error }
    }
    
    return { data: data as Appointment[], error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

