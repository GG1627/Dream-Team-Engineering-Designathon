'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { getMedicalHistoryByEmail, upsertMedicalHistoryByEmail, MedicalHistory } from '@/lib/patients';
import { supabase } from '@/lib/supabase';
import { FullPageLoading, ButtonLoadingSpinner } from '@/app/components/LoadingSpinner';
import { IoMicOutline, IoMic, IoCalendarOutline, IoTimeOutline, IoLocationOutline } from 'react-icons/io5';
import { HiOutlineDocumentText } from 'react-icons/hi2';

// OpenStreetMap Nominatim API types
interface NominatimResult {
  display_name: string;
  place_id: number;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// Debounce function for API calls
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format phone number to (111) 111-1111 format
function formatPhoneNumber(value: string): string {
  const phoneNumber = value.replace(/\D/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

export default function CreateAppointmentPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState(''); // Real-time transcript from Web Speech API
  const [soapNotes, setSoapNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null); // Web Speech API recognition

  // Medical history state
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  
  // Medical history form state
  const [bloodType, setBloodType] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [conditions, setConditions] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [hospitalizations, setHospitalizations] = useState('');
  const [smokingStatus, setSmokingStatus] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [exerciseFrequency, setExerciseFrequency] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [mentalHealth, setMentalHealth] = useState('');
  const [immunizations, setImmunizations] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  // Backend URL
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Location autocomplete state
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search OpenStreetMap Nominatim API
  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=us`,
        {
          headers: {
            'User-Agent': 'Sana Medical App', // Required by Nominatim
          },
        }
      );

      if (response.ok) {
        const data: NominatimResult[] = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Debounced search function (1 second delay to respect rate limits)
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchAddresses(query);
    }, 1000),
    [searchAddresses]
  );

  // Handle location input change
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    debouncedSearch(value);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: NominatimResult) => {
    setLocation(suggestion.display_name);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Clear CUDA cache when visiting the page to free up memory
    const clearCache = async () => {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        await fetch(`${BACKEND_URL}/pipeline/clear-cache`, {
          method: 'POST',
        });
      } catch (error) {
        // Silently fail - cache clearing is best effort
        console.log('Cache clear request failed (non-critical):', error);
      }
    };
    
    clearCache();
  }, []);

  const checkAuth = async () => {
    const { user: currentUser, error } = await getCurrentUser();
    
    if (error || !currentUser) {
      router.push('/patient/login');
      return;
    }
    
    setUser(currentUser);
    
    // Fetch medical history if available
    if (currentUser.email) {
      const { data: history } = await getMedicalHistoryByEmail(currentUser.email);
      if (history) {
        setMedicalHistory(history);
        // Pre-fill notes with relevant medical history summary
        const historySummary = [];
        if (history.chronic_conditions) historySummary.push(`Chronic conditions: ${history.chronic_conditions}`);
        if (history.current_medications) historySummary.push(`Current medications: ${history.current_medications}`);
        if (history.allergies) historySummary.push(`Allergies: ${history.allergies}`);
        if (historySummary.length > 0) {
          setNotes(historySummary.join('\n'));
        }
        
        // Pre-fill form state if opening modal
        setBloodType(history.blood_type || '');
        setHeightInches(history.height_inches?.toString() || '');
        setWeightLbs(history.weight_lbs?.toString() || '');
        setAllergies(history.allergies || '');
        setMedications(history.current_medications || '');
        setConditions(history.chronic_conditions || '');
        setSurgeries(history.past_surgeries || '');
        setHospitalizations(history.previous_hospitalizations || '');
        setSmokingStatus(history.smoking_status || '');
        setAlcoholUse(history.alcohol_use || '');
        setExerciseFrequency(history.exercise_frequency || '');
        setFamilyHistory(history.family_history || '');
        setMentalHealth(history.mental_health_history || '');
        setImmunizations(history.immunization_history || '');
        setEmergencyName(history.emergency_contact_name || '');
        setEmergencyPhone(history.emergency_contact_phone || '');
        setEmergencyRelation(history.emergency_contact_relation || '');
        setInsuranceProvider(history.insurance_provider || '');
        setInsurancePolicy(history.insurance_policy_number || '');
        setOtherNotes(history.other_notes || '');
      }
    }
    
    setLoading(false);
  };

  const handleStartRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Match Whisper's expected sample rate
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      
      // Start Web Speech API for real-time transcription (instant feedback)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          // Get all final transcripts (accumulated)
          let allFinalTranscript = '';
          for (let i = 0; i < event.resultIndex; i++) {
            if (event.results[i].isFinal) {
              allFinalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          
          // Get current results (both final and interim)
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              allFinalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // Combine all final transcripts with current interim
          const fullTranscript = (allFinalTranscript + interimTranscript).trim();
          if (fullTranscript) {
            setLiveTranscript(fullTranscript);
            setReason(fullTranscript); // Update reason field in real-time
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Don't stop recording on error, just log it
        };
        
        recognition.onend = () => {
          // Restart recognition if still recording
          if (isRecording && mediaRecorderRef.current?.state === 'recording') {
            try {
              recognition.start();
            } catch (e) {
              // Ignore errors when restarting
            }
          }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
      }
      
      // Determine best audio format for MediaRecorder (for backend processing)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        // Stop Web Speech API
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Process full audio through backend for accurate transcription + SOAP
        await processAudioToSOAP();
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setVoiceTranscript('');
      setLiveTranscript('');
      setSoapNotes('');
      setReason('');
      setError(null);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Microphone access denied. Please allow microphone permissions and try again.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Stop Web Speech API
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioToSOAP = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Combine all audio chunks into one blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size === 0) {
        throw new Error('No audio recorded. Please try again.');
      }
      
      // Check if backend is reachable first
      try {
        const healthCheck = await fetch(`${BACKEND_URL}/pipeline/health`);
        if (!healthCheck.ok) {
          throw new Error('Backend is not responding. Make sure the FastAPI server is running on ' + BACKEND_URL);
        }
      } catch (healthError: any) {
        if (healthError.message.includes('Failed to fetch') || healthError.message.includes('NetworkError')) {
          throw new Error('Cannot connect to backend server. Please make sure:\n1. FastAPI server is running (uvicorn backend.main:app --reload)\n2. Server is running on ' + BACKEND_URL);
        }
        throw healthError;
      }
      
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Send to backend pipeline
      const response = await fetch(`${BACKEND_URL}/pipeline/audio-to-soap`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set final transcript and SOAP notes
      setVoiceTranscript(data.transcript);
      setSoapNotes(data.soap_summary);
      
      // Use final accurate transcript (may be better than live chunks)
      setReason(data.transcript);
      setLiveTranscript(data.transcript); // Update live transcript with final version
      
      // Clear CUDA cache after successful processing to free memory
      try {
        await fetch(`${BACKEND_URL}/pipeline/clear-cache`, {
          method: 'POST',
        });
      } catch (cacheError) {
        // Silently fail - cache clearing is best effort
        console.log('Cache clear after processing failed (non-critical):', cacheError);
      }
      
    } catch (error: any) {
      console.error('Error processing audio:', error);
      const errorMessage = error.message || 'Failed to process audio. Please try again.';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const handleUseVoiceTranscript = () => {
    if (voiceTranscript) {
      setReason(voiceTranscript);
      // SOAP notes are already stored in soapNotes state
    }
  };

  const handleOpenHistoryModal = () => {
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setError(null);
  };

  const handleSaveHistory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingHistory(true);
    setError(null);

    if (!user?.email) {
      setError('Unable to identify user');
      setSavingHistory(false);
      return;
    }

    const historyData: Partial<MedicalHistory> = {
      blood_type: bloodType.trim() || null,
      height_inches: heightInches ? parseInt(heightInches) : null,
      weight_lbs: weightLbs ? parseInt(weightLbs) : null,
      allergies: allergies.trim() || null,
      current_medications: medications.trim() || null,
      chronic_conditions: conditions.trim() || null,
      past_surgeries: surgeries.trim() || null,
      previous_hospitalizations: hospitalizations.trim() || null,
      smoking_status: smokingStatus || null,
      alcohol_use: alcoholUse || null,
      exercise_frequency: exerciseFrequency || null,
      family_history: familyHistory.trim() || null,
      mental_health_history: mentalHealth.trim() || null,
      immunization_history: immunizations.trim() || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      emergency_contact_relation: emergencyRelation.trim() || null,
      insurance_provider: insuranceProvider.trim() || null,
      insurance_policy_number: insurancePolicy.trim() || null,
      other_notes: otherNotes.trim() || null,
    };

    const { data, error: historyError } = await upsertMedicalHistoryByEmail(user.email, historyData);

    if (historyError) {
      setError(historyError.message || 'Failed to save medical history');
      setSavingHistory(false);
      return;
    }

    setMedicalHistory(data);
    setSavingHistory(false);
    setShowHistoryModal(false);
    
    // Refresh notes with updated history
    const historySummary = [];
    if (data?.chronic_conditions) historySummary.push(`Chronic conditions: ${data.chronic_conditions}`);
    if (data?.current_medications) historySummary.push(`Current medications: ${data.current_medications}`);
    if (data?.allergies) historySummary.push(`Allergies: ${data.allergies}`);
    if (historySummary.length > 0) {
      setNotes(historySummary.join('\n'));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!appointmentDate || !appointmentTime || !reason) {
      setError('Please fill in all required fields');
      setSaving(false);
      return;
    }

    try {
      // Get current user
      const { user: currentUser } = await getCurrentUser();
      if (!currentUser?.email) {
        throw new Error('User not authenticated');
      }

      // Get patient ID from Supabase
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('email', currentUser.email)
        .single();

      if (patientError || !patientData) {
        throw new Error('Patient record not found');
      }

      // Create appointment with SOAP notes
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientData.id,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          location: location || null,
          reason: reason, // User-facing reason (transcript)
          transcript: voiceTranscript || null, // Raw transcript if available
          soap_notes: soapNotes || null, // SOAP notes for doctors
          notes: notes || null, // Additional notes
          status: 'scheduled'
        });

      if (insertError) {
        throw insertError;
      }

      // Clear CUDA cache after successful submission to free memory
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        await fetch(`${BACKEND_URL}/pipeline/clear-cache`, {
          method: 'POST',
        });
      } catch (error) {
        // Silently fail - cache clearing is best effort
        console.log('Cache clear after submit failed (non-critical):', error);
      }

      router.push('/patient/dashboard');
      
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      setError(error.message || 'Failed to create appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FullPageLoading />;
  }

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#F5F9F7]">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 border-b border-[#D4E4DD] bg-white">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Image
                src="/Logo.png"
                alt="Sana Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
            </Link>
            <Link href="/patient/dashboard" className="text-xl font-semibold text-[#2D3748] font-poppins hover:text-[#2D3748] transition-colors">
              Sana
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/patient/dashboard"
              className="px-4 py-2 text-sm text-[#64748B] hover:text-[#2D3748] transition-colors font-inter"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-[#2D3748] mb-2 font-poppins">
            Schedule Appointment
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            Book your appointment and describe your symptoms
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-inter">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date & Time Section */}
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
            <h2 className="text-xl font-semibold text-[#2D3748] mb-6 font-poppins flex items-center gap-2">
              <IoCalendarOutline className="text-[#4A7C7E]" />
              Date & Time
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="appointmentDate" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  Appointment Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="appointmentDate"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                  required
                />
              </div>
              <div>
                <label htmlFor="appointmentTime" className="flex items-center gap-2 text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  <IoTimeOutline />
                  Appointment Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="appointmentTime"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
            <h2 className="text-xl font-semibold text-[#2D3748] mb-6 font-poppins flex items-center gap-2">
              <IoLocationOutline className="text-[#4A7C7E]" />
              Location
            </h2>
            <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                Appointment Location
              </label>
              <input
                ref={locationInputRef}
                id="location"
                type="text"
                value={location}
                onChange={handleLocationChange}
                onFocus={() => {
                  if (locationSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                placeholder="Start typing an address..."
                autoComplete="off"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (locationSuggestions.length > 0 || isLoadingSuggestions) && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-[#D4E4DD] rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center text-sm text-[#64748B] font-inter">
                      Searching...
                    </div>
                  ) : (
                    locationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.place_id}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F5F9F7] transition-colors border-b border-[#D4E4DD] last:border-b-0 font-inter"
                      >
                        <div className="text-sm text-[#2D3748] font-medium">
                          {suggestion.display_name}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reason for Visit Section */}
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
            <h2 className="text-xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2 mb-6">
              <HiOutlineDocumentText className="text-[#4A7C7E]" />
              Reason for Visit <span className="text-red-500">*</span>
            </h2>
            
            {/* Primary: Voice Input */}
            <div className="mb-6">
              <div className="flex flex-col items-center justify-center py-8 px-6 bg-gradient-to-br from-[#F5F9F7] to-[#E8F3F0] rounded-xl border-2 border-dashed border-[#D4E4DD]">
                {!isRecording && !voiceTranscript && !reason && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="voice-button-shine text-white hover:scale-105 px-8 py-4 rounded-xl font-semibold transition-all font-inter text-base flex items-center gap-3 relative mb-4"
                    >
                      <IoMicOutline className="relative z-10 text-xl" />
                      <span className="relative z-10">Click to Start Voice Input</span>
                    </button>
                    <p className="text-sm text-[#64748B] font-inter text-center">
                      Speak your symptoms for faster entry
                    </p>
                  </>
                )}
                
                {isRecording && (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/50 px-8 py-4 rounded-xl font-semibold transition-all font-inter text-base flex items-center gap-3 animate-pulse"
                    >
                      <IoMic className="text-xl" />
                      <span>Stop Recording</span>
                    </button>
                    <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-semibold text-red-700 font-inter">Recording...</p>
                      </div>
                      <p className="text-xs text-[#64748B] font-inter mb-3">
                        Speak clearly into your microphone. Click "Stop Recording" when finished.
                      </p>
                      
                      {/* Live transcript display */}
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs font-semibold text-[#2D3748] mb-2 font-inter">Live Transcription:</p>
                        <div className="text-sm text-[#2D3748] font-inter bg-white p-3 rounded-lg min-h-[60px]">
                          {liveTranscript || <span className="text-[#64748B] italic">Listening... speak now</span>}
                        </div>
                        <p className="text-xs text-[#64748B] mt-2 font-inter italic">
                          (Real-time preview - final transcription will be more accurate)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="w-full p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-[#2D3748] font-inter">
                        Processing audio and generating SOAP notes...
                      </p>
                    </div>
                  </div>
                )}
                
                {voiceTranscript && !isProcessing && (
                  <div className="w-full">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-[#2D3748] font-inter">Voice Transcript:</p>
                        <button
                          type="button"
                          onClick={handleUseVoiceTranscript}
                          className="text-sm text-blue-600 hover:text-blue-800 font-semibold font-inter px-3 py-1 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Use This ✓
                        </button>
                      </div>
                      <p className="text-sm text-[#64748B] font-inter italic mb-3">"{voiceTranscript}"</p>
                      
                      {/* Show SOAP notes preview */}
                      {soapNotes && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs font-semibold text-[#2D3748] mb-2 font-inter">SOAP Notes Generated:</p>
                          <div className="text-xs text-[#64748B] font-inter bg-white p-3 rounded-lg max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans">{soapNotes}</pre>
                          </div>
                          <p className="text-xs text-[#64748B] mt-2 font-inter italic">
                            (SOAP notes will be saved for your doctor)
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-full px-4 py-2 text-sm text-[#64748B] hover:text-[#2D3748] font-inter border border-[#D4E4DD] rounded-lg hover:border-[#B8D4CC] transition-colors"
                    >
                      Record Again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary: Text Input */}
            <div className="border-t border-[#D4E4DD] pt-6">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="reason" className="text-sm font-medium text-[#64748B] font-inter">
                  Or type manually
                </label>
                {reason && (
                  <span className="text-xs text-green-600 font-inter">✓ Text entered</span>
                )}
              </div>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                placeholder="Type your symptoms or reason for the appointment..."
                rows={3}
                required
              />
            </div>
          </div>

          {/* Additional Notes Section */}
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
            <h2 className="text-xl font-semibold text-[#2D3748] mb-6 font-poppins">
              Additional Notes
            </h2>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                Additional Information
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                placeholder="Any additional information that might be helpful..."
                rows={4}
              />
              <p className="mt-2 text-xs text-[#64748B] font-inter">
                Your medical history has been pre-filled above. You can edit or add to it.
              </p>
            </div>
          </div>

          {/* Medical History Section */}
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
                  <HiOutlineDocumentText className="text-[#4A7C7E]" />
                  Medical History
                </h2>
                <p className="text-sm text-[#64748B] font-inter mt-1">
                  Pre-fill your medical history to speed up appointments
                </p>
              </div>
            </div>
            
            {medicalHistory ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 text-xl">✓</span>
                  <p className="text-sm font-semibold text-green-700 font-inter">
                    Medical History Already Filled
                  </p>
                </div>
                <p className="text-xs text-[#64748B] font-inter">
                  Your medical history is on file and will be automatically included in your appointments. This saves time and ensures accuracy.
                </p>
                <button
                  type="button"
                  onClick={handleOpenHistoryModal}
                  className="mt-3 text-xs text-green-700 hover:text-green-800 font-inter underline"
                >
                  Update Medical History
                </button>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-[#2D3748] font-inter mb-3">
                  Fill out your medical history once to speed up future appointments. Your information will be automatically included.
                </p>
                <button
                  type="button"
                  onClick={handleOpenHistoryModal}
                  className="px-4 py-2 bg-[#4A7C7E] text-white rounded-lg font-medium hover:bg-[#3A6C6E] transition-colors font-inter text-sm"
                >
                  Add Medical History
                </button>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-[#4A7C7E] text-white rounded-xl font-medium hover:bg-[#3A6C6E] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <ButtonLoadingSpinner />}
              {saving ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
            <Link
              href="/patient/dashboard"
              className="px-6 py-3 bg-white text-[#2D3748] rounded-xl font-medium border-2 border-[#D4E4DD] hover:border-[#B8D4CC] hover:bg-[#F5F9F7] transition-all font-inter"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Medical History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#D4E4DD] sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins">
                    {medicalHistory ? 'Update Medical History' : 'Add Medical History'}
                  </h2>
                  <button
                    onClick={handleCloseHistoryModal}
                    className="text-[#64748B] hover:text-[#2D3748] transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSaveHistory} className="p-6 space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-inter">
                    {error}
                  </div>
                )}

                {/* Basic Health Info Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Basic Health Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="modal-bloodType" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Blood Type
                      </label>
                      <select
                        id="modal-bloodType"
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-heightInches" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Height (inches)
                      </label>
                      <input
                        id="modal-heightInches"
                        type="number"
                        min="0"
                        max="120"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="70"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-weightLbs" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Weight (lbs)
                      </label>
                      <input
                        id="modal-weightLbs"
                        type="number"
                        min="0"
                        max="1000"
                        value={weightLbs}
                        onChange={(e) => setWeightLbs(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="150"
                      />
                    </div>
                  </div>
                </div>

                {/* Allergies & Medications Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Allergies & Medications
                  </h3>
                  <div>
                    <label htmlFor="modal-allergies" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Allergies
                    </label>
                    <textarea
                      id="modal-allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-medications" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Current Medications
                    </label>
                    <textarea
                      id="modal-medications"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List current medications, dosages, and frequency (e.g., Metformin 500mg twice daily)"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Medical History Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Medical History
                  </h3>
                  <div>
                    <label htmlFor="modal-conditions" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Chronic Conditions
                    </label>
                    <textarea
                      id="modal-conditions"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List chronic conditions (e.g., Diabetes Type 2, Hypertension, Asthma)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-surgeries" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Past Surgeries
                    </label>
                    <textarea
                      id="modal-surgeries"
                      value={surgeries}
                      onChange={(e) => setSurgeries(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List past surgeries and dates (e.g., Appendectomy - 2015)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-hospitalizations" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Previous Hospitalizations
                    </label>
                    <textarea
                      id="modal-hospitalizations"
                      value={hospitalizations}
                      onChange={(e) => setHospitalizations(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List previous hospitalizations, dates, and reasons"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Lifestyle Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Lifestyle
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="modal-smokingStatus" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Smoking Status
                      </label>
                      <select
                        id="modal-smokingStatus"
                        value={smokingStatus}
                        onChange={(e) => setSmokingStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="never">Never</option>
                        <option value="former">Former Smoker</option>
                        <option value="current">Current Smoker</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-alcoholUse" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Alcohol Use
                      </label>
                      <select
                        id="modal-alcoholUse"
                        value={alcoholUse}
                        onChange={(e) => setAlcoholUse(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="none">None</option>
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-exerciseFrequency" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Exercise Frequency
                      </label>
                      <select
                        id="modal-exerciseFrequency"
                        value={exerciseFrequency}
                        onChange={(e) => setExerciseFrequency(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="none">None</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Family & Mental Health Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Family & Mental Health
                  </h3>
                  <div>
                    <label htmlFor="modal-familyHistory" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Family History
                    </label>
                    <textarea
                      id="modal-familyHistory"
                      value={familyHistory}
                      onChange={(e) => setFamilyHistory(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="Relevant family medical history (e.g., Father: Heart disease, Mother: Diabetes)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-mentalHealth" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Mental Health History
                    </label>
                    <textarea
                      id="modal-mentalHealth"
                      value={mentalHealth}
                      onChange={(e) => setMentalHealth(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="Mental health conditions, treatments, or relevant history"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Immunizations Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Immunizations
                  </h3>
                  <div>
                    <label htmlFor="modal-immunizations" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Immunization History
                    </label>
                    <textarea
                      id="modal-immunizations"
                      value={immunizations}
                      onChange={(e) => setImmunizations(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="List immunizations and dates (e.g., COVID-19 vaccine - 2021, Flu shot - 2024)"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Emergency Contact
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="modal-emergencyName" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Contact Name
                      </label>
                      <input
                        id="modal-emergencyName"
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-emergencyPhone" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Contact Phone
                      </label>
                      <input
                        id="modal-emergencyPhone"
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(formatPhoneNumber(e.target.value))}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-emergencyRelation" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Relationship
                      </label>
                      <input
                        id="modal-emergencyRelation"
                        type="text"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="Spouse, Parent, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Insurance Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="modal-insuranceProvider" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Insurance Provider
                      </label>
                      <input
                        id="modal-insuranceProvider"
                        type="text"
                        value={insuranceProvider}
                        onChange={(e) => setInsuranceProvider(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="Blue Cross Blue Shield"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-insurancePolicy" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                        Policy Number
                      </label>
                      <input
                        id="modal-insurancePolicy"
                        type="text"
                        value={insurancePolicy}
                        onChange={(e) => setInsurancePolicy(e.target.value)}
                        className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                        placeholder="ABC123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Notes Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#2D3748] font-poppins border-b border-[#D4E4DD] pb-2">
                    Additional Information
                  </h3>
                  <div>
                    <label htmlFor="modal-otherNotes" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                      Other Notes
                    </label>
                    <textarea
                      id="modal-otherNotes"
                      value={otherNotes}
                      onChange={(e) => setOtherNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                      placeholder="Any other relevant medical information"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-[#D4E4DD]">
                  <button
                    type="submit"
                    disabled={savingHistory}
                    className="px-6 py-3 bg-[#4A7C7E] text-white rounded-xl font-medium hover:bg-[#3A6C6E] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingHistory && <ButtonLoadingSpinner />}
                    {savingHistory ? 'Saving...' : 'Save Medical History'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseHistoryModal}
                    className="px-6 py-3 bg-white text-[#2D3748] rounded-xl font-medium border-2 border-[#D4E4DD] hover:border-[#B8D4CC] hover:bg-[#F5F9F7] transition-all font-inter"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

