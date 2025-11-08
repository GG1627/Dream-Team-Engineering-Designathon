'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getPatientData, updatePatientData, PatientData, getMedicalHistoryByEmail, upsertMedicalHistoryByEmail, MedicalHistory } from '@/lib/patients';
import { FullPageLoading, ButtonLoadingSpinner } from '@/app/components/LoadingSpinner';
import { HiOutlineDocumentText } from 'react-icons/hi2';

/**
 * Format phone number to (111) 111-1111 format
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

export default function PatientProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');

  // Medical history form state
  // Basic Health Info
  const [bloodType, setBloodType] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  // Allergies & Medications
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  // Medical History
  const [conditions, setConditions] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [hospitalizations, setHospitalizations] = useState('');
  // Lifestyle
  const [smokingStatus, setSmokingStatus] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [exerciseFrequency, setExerciseFrequency] = useState('');
  // Family & Mental Health
  const [familyHistory, setFamilyHistory] = useState('');
  const [mentalHealth, setMentalHealth] = useState('');
  // Immunizations
  const [immunizations, setImmunizations] = useState('');
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  // Other
  const [otherNotes, setOtherNotes] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { user: currentUser, error } = await getCurrentUser();
    
    if (error || !currentUser) {
      router.push('/patient/login');
      return;
    }
    
    setUser(currentUser);
    
    // Fetch patient data
    const { data: patient, error: patientError } = await getPatientData(currentUser.email);
    
    if (patientError) {
      console.error('Error fetching patient data:', patientError);
      // Still show page, just with empty data
    }
    
    if (patient) {
      setPatientData(patient);
      setName(patient.name || '');
      setPhone(patient.phone || '');
      setAge(patient.age?.toString() || '');
    } else {
      // If no patient record exists, use auth metadata
      setName(currentUser.user_metadata?.name || currentUser.email.split('@')[0]);
    }
    
    // Fetch medical history
    const { data: history, error: historyError } = await getMedicalHistoryByEmail(currentUser.email);
    if (historyError) {
      console.error('Error fetching medical history:', historyError);
    }
    if (history) {
      setMedicalHistory(history);
      // Basic Health Info
      setBloodType(history.blood_type || '');
      setHeightInches(history.height_inches?.toString() || '');
      setWeightLbs(history.weight_lbs?.toString() || '');
      // Allergies & Medications
      setAllergies(history.allergies || '');
      setMedications(history.current_medications || '');
      // Medical History
      setConditions(history.chronic_conditions || '');
      setSurgeries(history.past_surgeries || '');
      setHospitalizations(history.previous_hospitalizations || '');
      // Lifestyle
      setSmokingStatus(history.smoking_status || '');
      setAlcoholUse(history.alcohol_use || '');
      setExerciseFrequency(history.exercise_frequency || '');
      // Family & Mental Health
      setFamilyHistory(history.family_history || '');
      setMentalHealth(history.mental_health_history || '');
      // Immunizations
      setImmunizations(history.immunization_history || '');
      // Emergency Contact
      setEmergencyName(history.emergency_contact_name || '');
      setEmergencyPhone(history.emergency_contact_phone || '');
      setEmergencyRelation(history.emergency_contact_relation || '');
      // Insurance
      setInsuranceProvider(history.insurance_provider || '');
      setInsurancePolicy(history.insurance_policy_number || '');
      // Other
      setOtherNotes(history.other_notes || '');
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (!user?.email) {
      setError('Unable to identify user');
      setSaving(false);
      return;
    }

    const updates: Partial<PatientData> = {
      name: name.trim(),
      phone: phone.trim() || null,
      age: age ? parseInt(age) : null,
    };

    const { data, error: updateError } = await updatePatientData(user.email, updates);

    if (updateError) {
      setError(updateError.message || 'Failed to update profile');
      setSaving(false);
      return;
    }

    // Update auth metadata as well (update name in auth)
    await supabase.auth.updateUser({
      data: { name: name.trim() }
    });

    setPatientData(data);
    setSuccess(true);
    setSaving(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
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
      // Basic Health Info
      blood_type: bloodType.trim() || null,
      height_inches: heightInches ? parseInt(heightInches) : null,
      weight_lbs: weightLbs ? parseInt(weightLbs) : null,
      // Allergies & Medications
      allergies: allergies.trim() || null,
      current_medications: medications.trim() || null,
      // Medical History
      chronic_conditions: conditions.trim() || null,
      past_surgeries: surgeries.trim() || null,
      previous_hospitalizations: hospitalizations.trim() || null,
      // Lifestyle
      smoking_status: smokingStatus || null,
      alcohol_use: alcoholUse || null,
      exercise_frequency: exerciseFrequency || null,
      // Family & Mental Health
      family_history: familyHistory.trim() || null,
      mental_health_history: mentalHealth.trim() || null,
      // Immunizations
      immunization_history: immunizations.trim() || null,
      // Emergency Contact
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      emergency_contact_relation: emergencyRelation.trim() || null,
      // Insurance
      insurance_provider: insuranceProvider.trim() || null,
      insurance_policy_number: insurancePolicy.trim() || null,
      // Other
      other_notes: otherNotes.trim() || null,
    };

    const { data, error: historyError } = await upsertMedicalHistoryByEmail(user.email, historyData);

    if (historyError) {
      setError(historyError.message || 'Failed to save medical history');
      setSavingHistory(false);
      return;
    }

    setMedicalHistory(data);
    setSuccess(true);
    setSavingHistory(false);
    setShowHistoryModal(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 border-b border-[#E2E8F0] bg-white">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/patient/dashboard">
              <Image
                src="/Logo.png"
                alt="Lunari Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
            </Link>
            <Link href="/patient/dashboard" className="text-xl font-semibold text-[#1E293B] font-poppins hover:text-[#0F172A] transition-colors">
              Lunari
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/patient/dashboard"
              className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors font-inter"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors font-inter"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-[#0F172A] mb-2 font-poppins">
            Profile Settings
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            Update your personal information
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-inter">
            Profile updated successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-inter">
            {error}
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8">
          <h2 className="text-xl font-semibold text-[#0F172A] mb-6 font-poppins">Personal Information</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#64748B] font-inter cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[#64748B] font-inter">Email cannot be changed</p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                placeholder="Your Name"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                placeholder="(555) 123-4567"
                maxLength={14}
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                Age
              </label>
              <input
                id="age"
                type="number"
                min="0"
                max="150"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                placeholder="25"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-medium hover:bg-[#1E293B] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <ButtonLoadingSpinner />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/patient/dashboard"
                className="px-6 py-3 bg-white text-[#0F172A] rounded-xl font-medium border-2 border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all font-inter"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Medical History Section */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#0F172A] font-poppins flex items-center gap-2">
                <HiOutlineDocumentText className="text-[#0F172A]" />
                Medical History
              </h2>
              <p className="text-sm text-[#64748B] font-inter mt-1">
                Your medical history will be pre-filled when creating appointments
              </p>
            </div>
            <button
              onClick={handleOpenHistoryModal}
              className="px-4 py-2 bg-[#0F172A] text-white rounded-lg font-medium hover:bg-[#1E293B] transition-colors font-inter text-sm"
            >
              {medicalHistory ? 'Update Medical History' : 'No medical history detected, Add it'}
            </button>
          </div>
          {medicalHistory && (
            <div className="mt-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
              <p className="text-sm text-[#64748B] font-inter">
                {medicalHistory.allergies || medicalHistory.current_medications || medicalHistory.chronic_conditions || 
                 medicalHistory.blood_type || medicalHistory.emergency_contact_name
                  ? '✓ Medical history on file - Click to update'
                  : 'Medical history added but incomplete - Click to fill out'}
              </p>
            </div>
          )}
        </div>

        {/* Medical History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#E2E8F0] sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-[#0F172A] font-poppins">
                    {medicalHistory ? 'Update Medical History' : 'Add Medical History'}
                  </h2>
                  <button
                    onClick={handleCloseHistoryModal}
                    className="text-[#64748B] hover:text-[#0F172A] transition-colors text-2xl"
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
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Basic Health Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="bloodType" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Blood Type
                      </label>
                      <select
                        id="bloodType"
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
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
                      <label htmlFor="heightInches" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Height (inches)
                      </label>
                      <input
                        id="heightInches"
                        type="number"
                        min="0"
                        max="120"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="70"
                      />
                    </div>
                    <div>
                      <label htmlFor="weightLbs" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Weight (lbs)
                      </label>
                      <input
                        id="weightLbs"
                        type="number"
                        min="0"
                        max="1000"
                        value={weightLbs}
                        onChange={(e) => setWeightLbs(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="150"
                      />
                    </div>
                  </div>
                </div>

                {/* Allergies & Medications Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Allergies & Medications
                  </h3>
                  <div>
                    <label htmlFor="allergies" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Allergies
                    </label>
                    <textarea
                      id="allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="medications" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Current Medications
                    </label>
                    <textarea
                      id="medications"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List current medications, dosages, and frequency (e.g., Metformin 500mg twice daily)"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Medical History Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Medical History
                  </h3>
                  <div>
                    <label htmlFor="conditions" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Chronic Conditions
                    </label>
                    <textarea
                      id="conditions"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List chronic conditions (e.g., Diabetes Type 2, Hypertension, Asthma)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="surgeries" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Past Surgeries
                    </label>
                    <textarea
                      id="surgeries"
                      value={surgeries}
                      onChange={(e) => setSurgeries(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List past surgeries and dates (e.g., Appendectomy - 2015)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="hospitalizations" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Previous Hospitalizations
                    </label>
                    <textarea
                      id="hospitalizations"
                      value={hospitalizations}
                      onChange={(e) => setHospitalizations(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List previous hospitalizations, dates, and reasons"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Lifestyle Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Lifestyle
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="smokingStatus" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Smoking Status
                      </label>
                      <select
                        id="smokingStatus"
                        value={smokingStatus}
                        onChange={(e) => setSmokingStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="never">Never</option>
                        <option value="former">Former Smoker</option>
                        <option value="current">Current Smoker</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="alcoholUse" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Alcohol Use
                      </label>
                      <select
                        id="alcoholUse"
                        value={alcoholUse}
                        onChange={(e) => setAlcoholUse(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      >
                        <option value="">Select...</option>
                        <option value="none">None</option>
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="exerciseFrequency" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Exercise Frequency
                      </label>
                      <select
                        id="exerciseFrequency"
                        value={exerciseFrequency}
                        onChange={(e) => setExerciseFrequency(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
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
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Family & Mental Health
                  </h3>
                  <div>
                    <label htmlFor="familyHistory" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Family History
                    </label>
                    <textarea
                      id="familyHistory"
                      value={familyHistory}
                      onChange={(e) => setFamilyHistory(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="Relevant family medical history (e.g., Father: Heart disease, Mother: Diabetes)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="mentalHealth" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Mental Health History
                    </label>
                    <textarea
                      id="mentalHealth"
                      value={mentalHealth}
                      onChange={(e) => setMentalHealth(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="Mental health conditions, treatments, or relevant history"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Immunizations Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Immunizations
                  </h3>
                  <div>
                    <label htmlFor="immunizations" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Immunization History
                    </label>
                    <textarea
                      id="immunizations"
                      value={immunizations}
                      onChange={(e) => setImmunizations(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="List immunizations and dates (e.g., COVID-19 vaccine - 2021, Flu shot - 2024)"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Emergency Contact
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="emergencyName" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Contact Name
                      </label>
                      <input
                        id="emergencyName"
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label htmlFor="emergencyPhone" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Contact Phone
                      </label>
                      <input
                        id="emergencyPhone"
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(formatPhoneNumber(e.target.value))}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label htmlFor="emergencyRelation" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Relationship
                      </label>
                      <input
                        id="emergencyRelation"
                        type="text"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="Spouse, Parent, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Insurance Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="insuranceProvider" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Insurance Provider
                      </label>
                      <input
                        id="insuranceProvider"
                        type="text"
                        value={insuranceProvider}
                        onChange={(e) => setInsuranceProvider(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="Blue Cross Blue Shield"
                      />
                    </div>
                    <div>
                      <label htmlFor="insurancePolicy" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                        Policy Number
                      </label>
                      <input
                        id="insurancePolicy"
                        type="text"
                        value={insurancePolicy}
                        onChange={(e) => setInsurancePolicy(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                        placeholder="ABC123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Notes Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#0F172A] font-poppins border-b border-[#E2E8F0] pb-2">
                    Additional Information
                  </h3>
                  <div>
                    <label htmlFor="otherNotes" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
                      Other Notes
                    </label>
                    <textarea
                      id="otherNotes"
                      value={otherNotes}
                      onChange={(e) => setOtherNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
                      placeholder="Any other relevant medical information"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="submit"
                    disabled={savingHistory}
                    className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-medium hover:bg-[#1E293B] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingHistory && <ButtonLoadingSpinner />}
                    {savingHistory ? 'Saving...' : 'Save Medical History'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseHistoryModal}
                    className="px-6 py-3 bg-white text-[#0F172A] rounded-xl font-medium border-2 border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all font-inter"
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

