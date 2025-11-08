import { createClient } from '@supabase/supabase-js'

// Use environment variables if available, fallback to hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://snvcfxnrmcfzrwqrwetn.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudmNmeG5ybWNmenJ3cXJ3ZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQ1OTEsImV4cCI6MjA3ODIwMDU5MX0.Lc2VLVoyLphMEKDY6Sq6rbLAl2njzsGcet0uZd1iTt0"

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or anon key is not set")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})
export const HARDCODED_PASSWORD = "Test123!"