'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { getAllUpcomingAppointments, getPatientDataById, getMedicalHistory, Appointment, PatientData, MedicalHistory, updateAppointmentStatus, getCompletedAppointmentsToday, addMedication } from '@/lib/patients';
import { FullPageLoading, ButtonLoadingSpinner } from '@/app/components/LoadingSpinner';
import { IoCalendarOutline, IoClose, IoMedicalOutline } from 'react-icons/io5';
import { BsClock } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi2';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface AppointmentWithPatient extends Appointment {
  patient?: PatientData;
  medicalHistory?: MedicalHistory;
}

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<AppointmentWithPatient[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosage: '',
    total_amount: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [savingMedication, setSavingMedication] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { user: currentUser, error } = await getCurrentUser();
    
    if (error || !currentUser) {
      router.push('/doctor/login');
      return;
    }
    
    setUser(currentUser);
    await loadAppointments();
    await loadCompletedAppointments();
    setLoading(false);
  };

  const loadAppointments = async () => {
    try {
      const { data: appointmentsData, error } = await getAllUpcomingAppointments(50);
      if (error || !appointmentsData) {
        console.error('Error loading appointments:', error);
        return;
      }

      // Fetch patient data for each appointment
      const appointmentsWithPatients = await Promise.all(
        appointmentsData.map(async (appointment) => {
          let patient: PatientData | undefined;
          let medicalHistory: MedicalHistory | undefined;

          if (appointment.patient_id) {
            const { data: patientData } = await getPatientDataById(appointment.patient_id);
            patient = patientData || undefined;

            if (patient?.id) {
              const { data: historyData } = await getMedicalHistory(patient.id);
              medicalHistory = historyData || undefined;
            }
          }

          return {
            ...appointment,
            patient,
            medicalHistory,
          } as AppointmentWithPatient;
        })
      );

      setAppointments(appointmentsWithPatients);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadCompletedAppointments = async () => {
    try {
      const { data: completedData, error } = await getCompletedAppointmentsToday(50);
      if (error || !completedData) {
        console.error('Error loading completed appointments:', error);
        return;
      }

      // Fetch patient data for each completed appointment
      const completedWithPatients = await Promise.all(
        completedData.map(async (appointment) => {
          let patient: PatientData | undefined;
          let medicalHistory: MedicalHistory | undefined;

          if (appointment.patient_id) {
            const { data: patientData } = await getPatientDataById(appointment.patient_id);
            patient = patientData || undefined;

            if (patient?.id) {
              const { data: historyData } = await getMedicalHistory(patient.id);
              medicalHistory = historyData || undefined;
            }
          }

          return {
            ...appointment,
            patient,
            medicalHistory,
          } as AppointmentWithPatient;
        })
      );

      setCompletedAppointments(completedWithPatients);
    } catch (error) {
      console.error('Error loading completed appointments:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleAppointmentClick = (appointment: AppointmentWithPatient) => {
    setSelectedAppointment(appointment);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
    setShowMedicationForm(false);
    setMedicationForm({
      name: '',
      dosage: '',
      total_amount: '',
      start_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEndAppointment = async () => {
    if (!selectedAppointment?.id) return;

    setCompletingAppointment(true);
    try {
      const { data, error } = await updateAppointmentStatus(selectedAppointment.id, 'completed');
      
      if (error) {
        setSnackbarMessage('Failed to complete appointment');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setCompletingAppointment(false);
        return;
      }

      // Reload appointments
      await loadAppointments();
      await loadCompletedAppointments();
      
      setSnackbarMessage('Appointment completed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseModal();
      setCompletingAppointment(false);
    } catch (error) {
      console.error('Error completing appointment:', error);
      setSnackbarMessage('Failed to complete appointment');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setCompletingAppointment(false);
    }
  };

  const handlePrescribeMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedAppointment?.patient_id) {
      setSnackbarMessage('Patient ID not found');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!medicationForm.name || !medicationForm.dosage || !medicationForm.total_amount || !medicationForm.start_date) {
      setSnackbarMessage('Please fill in all fields');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setSavingMedication(true);
    try {
      const { data, error } = await addMedication(selectedAppointment.patient_id, {
        name: medicationForm.name,
        dosage: medicationForm.dosage,
        total_amount: parseInt(medicationForm.total_amount),
        start_date: medicationForm.start_date,
        created_by: user?.id || null
      });

      if (error) {
        setSnackbarMessage(error.message || 'Failed to prescribe medication');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSavingMedication(false);
        return;
      }

      setSnackbarMessage('Medication prescribed successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setMedicationForm({
        name: '',
        dosage: '',
        total_amount: '',
        start_date: new Date().toISOString().split('T')[0]
      });
      setShowMedicationForm(false);
      setSavingMedication(false);
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to prescribe medication');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setSavingMedication(false);
    }
  };

  if (loading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-screen bg-[#F5F9F7]">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 border-b border-[#D4E4DD] bg-white">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Sana Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold text-[#2D3748] font-poppins">Sana</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#64748B] font-inter">
              {user?.user_metadata?.name || 'Doctor'}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-[#64748B] hover:text-[#2D3748] transition-colors font-inter"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-[#2D3748] mb-2 font-poppins">
            Welcome, {user?.user_metadata?.name || 'Doctor'}
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            View patient records and manage medical documentation
          </p>
        </div>

        {/* Upcoming Appointments Section */}
        <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
                <IoCalendarOutline className="text-[#4A7C7E]" />
                Upcoming Appointments
              </h2>
              <p className="text-sm text-[#64748B] font-inter mt-1">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12 text-[#64748B] font-inter">
              <IoCalendarOutline className="text-5xl mx-auto mb-4 text-[#D4E4DD]" />
              <p className="mb-2 font-medium">No upcoming appointments</p>
              <p className="text-sm">Appointments will appear here once patients schedule them</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => handleAppointmentClick(appointment)}
                  className="group relative bg-gradient-to-br from-white to-[#FAF7F2] border border-[#D4E4DD] rounded-xl p-5 hover:border-[#4A7C7E] hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  {/* Status Badge */}
                  {appointment.status && (
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-inter ${
                        appointment.status === 'scheduled' 
                          ? 'bg-[#E8F3F0] text-[#6B9080] border border-[#D4E4DD]' 
                          : appointment.status === 'completed'
                          ? 'bg-[#E8F3F0] text-[#5A7A6D] border border-[#D4E4DD]'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                  )}

                  {/* Patient Name */}
                  <div className="mb-4 pr-20">
                    <h3 className="font-semibold text-[#2D3748] font-poppins text-lg mb-1">
                      {appointment.patient?.name || 'Unknown Patient'}
                    </h3>
                    {appointment.patient?.email && (
                      <p className="text-sm text-[#64748B] font-inter">
                        {appointment.patient.email}
                      </p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCalendarOutline className="text-[#4A7C7E] text-base" />
                      <p className="font-medium text-[#2D3748] font-inter">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <BsClock className="text-sm" />
                      <p className="font-medium font-inter text-sm">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                  </div>

                  {/* SOAP Notes Indicator */}
                  {appointment.soap_notes && (
                    <div className="mt-4 pt-4 border-t border-[#D4E4DD]">
                      <div className="flex items-center gap-2">
                        <HiOutlineDocumentText className="text-[#4A7C7E] text-base" />
                        <span className="text-xs font-medium text-[#4A7C7E] font-inter">
                          SOAP Notes Available
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Hover effect indicator */}
                  {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4A7C7E] to-[#3A6C6E] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div> */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Appointments Today Section */}
        {completedAppointments.length > 0 && (
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-8 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
                  <IoCalendarOutline className="text-[#4A7C7E]" />
                  Completed Appointments Today
                </h2>
                <p className="text-sm text-[#64748B] font-inter mt-1">
                  {completedAppointments.length} appointment{completedAppointments.length !== 1 ? 's' : ''} completed today
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => handleAppointmentClick(appointment)}
                  className="group relative bg-gradient-to-br from-white to-[#F5F9F7] border border-[#D4E4DD] rounded-xl p-5 hover:border-[#6B9080] hover:shadow-lg transition-all duration-200 cursor-pointer opacity-90"
                >
                  {/* Status Badge */}
                  {appointment.status && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-inter bg-[#E8F3F0] text-[#5A7A6D] border border-[#D4E4DD]">
                        Completed
                      </span>
                    </div>
                  )}

                  {/* Patient Name */}
                  <div className="mb-4 pr-20">
                    <h3 className="font-semibold text-[#2D3748] font-poppins text-lg mb-1">
                      {appointment.patient?.name || 'Unknown Patient'}
                    </h3>
                    {appointment.patient?.email && (
                      <p className="text-sm text-[#64748B] font-inter">
                        {appointment.patient.email}
                      </p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCalendarOutline className="text-[#4A7C7E] text-base" />
                      <p className="font-medium text-[#2D3748] font-inter">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <BsClock className="text-sm" />
                      <p className="font-medium font-inter text-sm">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                  </div>

                  {/* SOAP Notes Indicator */}
                  {appointment.soap_notes && (
                    <div className="mt-4 pt-4 border-t border-[#D4E4DD]">
                      <div className="flex items-center gap-2">
                        <HiOutlineDocumentText className="text-[#4A7C7E] text-base" />
                        <span className="text-xs font-medium text-[#4A7C7E] font-inter">
                          SOAP Notes Available
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Detail Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-[#D4E4DD] p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins">
                      {selectedAppointment.patient?.name || 'Unknown Patient'}
                    </h2>
                    <p className="text-sm text-[#64748B] font-inter mt-1">
                      {selectedAppointment.patient?.email || 'No email'}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-[#64748B] hover:text-[#2D3748] transition-colors text-2xl p-2 hover:bg-[#F5F9F7] rounded-lg"
                  >
                    <IoClose />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Appointment Details */}
                <div className="bg-[#F5F9F7] rounded-xl p-5 border border-[#D4E4DD]">
                  <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins">Appointment Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#64748B] font-inter mb-1">Date</p>
                      <p className="font-medium text-[#2D3748] font-inter">{formatDate(selectedAppointment.appointment_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] font-inter mb-1">Time</p>
                      <p className="font-medium text-[#2D3748] font-inter">{formatTime(selectedAppointment.appointment_time)}</p>
                    </div>
                    {selectedAppointment.status && (
                      <div>
                        <p className="text-sm text-[#64748B] font-inter mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold font-inter ${
                          selectedAppointment.status === 'scheduled' 
                            ? 'bg-[#E8F3F0] text-[#6B9080] border border-[#D4E4DD]' 
                            : selectedAppointment.status === 'completed'
                            ? 'bg-[#E8F3F0] text-[#5A7A6D] border border-[#D4E4DD]'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Information */}
                {selectedAppointment.patient && (
                  <div className="bg-white rounded-xl p-5 border border-[#D4E4DD]">
                    <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins">Patient Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[#64748B] font-inter mb-1">Name</p>
                        <p className="font-medium text-[#2D3748] font-inter">{selectedAppointment.patient.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#64748B] font-inter mb-1">Email</p>
                        <p className="font-medium text-[#2D3748] font-inter">{selectedAppointment.patient.email}</p>
                      </div>
                      {selectedAppointment.patient.phone && (
                        <div>
                          <p className="text-sm text-[#64748B] font-inter mb-1">Phone</p>
                          <p className="font-medium text-[#2D3748] font-inter">{selectedAppointment.patient.phone}</p>
                        </div>
                      )}
                      {selectedAppointment.patient.age && (
                        <div>
                          <p className="text-sm text-[#64748B] font-inter mb-1">Age</p>
                          <p className="font-medium text-[#2D3748] font-inter">{selectedAppointment.patient.age}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical History Summary */}
                {selectedAppointment.medicalHistory && (
                  <div className="bg-white rounded-xl p-5 border border-[#D4E4DD]">
                    <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins">Medical History</h3>
                    <div className="space-y-3">
                      {selectedAppointment.medicalHistory.allergies && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] font-inter mb-1">Allergies</p>
                          <p className="text-[#2D3748] font-inter">{selectedAppointment.medicalHistory!.allergies}</p>
                        </div>
                      )}
                      {selectedAppointment.medicalHistory.current_medications && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] font-inter mb-1">Current Medications</p>
                          <p className="text-[#2D3748] font-inter">{selectedAppointment.medicalHistory!.current_medications}</p>
                        </div>
                      )}
                      {selectedAppointment.medicalHistory.chronic_conditions && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] font-inter mb-1">Chronic Conditions</p>
                          <p className="text-[#2D3748] font-inter">{selectedAppointment.medicalHistory!.chronic_conditions}</p>
                        </div>
                      )}
                      {selectedAppointment.medicalHistory.blood_type && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] font-inter mb-1">Blood Type</p>
                          <p className="text-[#2D3748] font-inter">{selectedAppointment.medicalHistory!.blood_type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SOAP Notes */}
                {selectedAppointment.soap_notes && (
                  <div className="bg-[#E8F3F0] rounded-xl p-5 border border-[#B8D4CC]">
                    <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins flex items-center gap-2">
                      <HiOutlineDocumentText className="text-[#4A7C7E]" />
                      SOAP Notes
                    </h3>
                    <div className="bg-white rounded-lg p-4 border border-[#D4E4DD]">
                      <pre className="whitespace-pre-wrap font-inter text-sm text-[#2D3748] leading-relaxed">
                        {selectedAppointment.soap_notes}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {selectedAppointment.transcript && (
                  <div className="bg-white rounded-xl p-5 border border-[#D4E4DD]">
                    <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins">Transcript</h3>
                    <div className="bg-[#F5F9F7] rounded-lg p-4 border border-[#D4E4DD]">
                      <p className="text-sm text-[#2D3748] font-inter leading-relaxed italic">
                        "{selectedAppointment.transcript}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedAppointment.notes && (
                  <div className="bg-white rounded-xl p-5 border border-[#D4E4DD]">
                    <h3 className="text-lg font-semibold text-[#2D3748] mb-4 font-poppins">Additional Notes</h3>
                    <div className="bg-[#F5F9F7] rounded-lg p-4 border border-[#D4E4DD]">
                      <p className="text-sm text-[#2D3748] font-inter leading-relaxed whitespace-pre-wrap">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Prescribe Medication Section */}
                {selectedAppointment.status !== 'completed' && (
                  <div className="bg-white rounded-xl p-5 border border-[#D4E4DD]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
                        <IoMedicalOutline className="text-[#4A7C7E]" />
                        Prescribe Medication
                      </h3>
                      {!showMedicationForm && (
                        <button
                          onClick={() => setShowMedicationForm(true)}
                          className="px-4 py-2 bg-[#4A7C7E] text-white rounded-lg font-medium hover:bg-[#3A6C6E] transition-colors font-inter text-sm"
                        >
                          Add Medication
                        </button>
                      )}
                    </div>

                    {showMedicationForm && (
                      <form onSubmit={handlePrescribeMedication} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                              Medication Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={medicationForm.name}
                              onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })}
                              className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                              placeholder="e.g., Metformin"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                              Dosage <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={medicationForm.dosage}
                              onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
                              className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                              placeholder="e.g., 500mg twice daily"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                              Total Amount (days) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={medicationForm.total_amount}
                              onChange={(e) => setMedicationForm({ ...medicationForm, total_amount: e.target.value })}
                              className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                              placeholder="30"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                              Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={medicationForm.start_date}
                              onChange={(e) => setMedicationForm({ ...medicationForm, start_date: e.target.value })}
                              className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent font-inter"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                          <button
                            type="submit"
                            disabled={savingMedication}
                            className="px-6 py-3 bg-[#4A7C7E] text-white rounded-xl font-medium hover:bg-[#3A6C6E] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {savingMedication && <ButtonLoadingSpinner />}
                            {savingMedication ? 'Prescribing...' : 'Prescribe Medication'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMedicationForm(false);
                              setMedicationForm({
                                name: '',
                                dosage: '',
                                total_amount: '',
                                start_date: new Date().toISOString().split('T')[0]
                              });
                            }}
                            className="px-6 py-3 bg-white text-[#2D3748] rounded-xl font-medium border-2 border-[#D4E4DD] hover:border-[#6B9080] hover:bg-[#F5F9F7] transition-all font-inter"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* End Appointment Button */}
                {selectedAppointment.status !== 'completed' && (
                  <div className="sticky bottom-0 bg-white border-t border-[#D4E4DD] p-6 -mx-6 -mb-6 mt-6">
                    <button
                      onClick={handleEndAppointment}
                      disabled={completingAppointment}
                      className="w-full px-6 py-3 bg-[#6B9080] text-white rounded-xl font-medium hover:bg-[#5A7A6D] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {completingAppointment && <ButtonLoadingSpinner />}
                      {completingAppointment ? 'Completing...' : 'End Appointment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ 
              backgroundColor: snackbarSeverity === 'success' ? '#4A7C7E' : '#EF4444',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white'
              }
            }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
}

