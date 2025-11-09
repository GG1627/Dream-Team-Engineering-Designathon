'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { getAllUpcomingAppointments, getPatientDataById, getMedicalHistory, Appointment, PatientData, MedicalHistory } from '@/lib/patients';
import { FullPageLoading } from '@/app/components/LoadingSpinner';
import { IoCalendarOutline, IoClose } from 'react-icons/io5';
import { BsClock } from 'react-icons/bs';
import { HiOutlineDocumentText } from 'react-icons/hi2';

interface AppointmentWithPatient extends Appointment {
  patient?: PatientData;
  medicalHistory?: MedicalHistory;
}

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
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
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4A7C7E] to-[#3A6C6E] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              ))}
            </div>
          )}
        </div>

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
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

