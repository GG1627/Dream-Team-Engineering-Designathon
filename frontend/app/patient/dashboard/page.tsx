'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { getAppointmentsByEmail, getUpcomingAppointmentsByEmail, Appointment, getMedicationsByEmail, addMedicationByEmail, Medication, deleteMedication } from '@/lib/patients';
import { FullPageLoading, ButtonLoadingSpinner } from '@/app/components/LoadingSpinner';
import { IoCalendarOutline, IoAddCircleOutline, IoLocationOutline, IoClose } from "react-icons/io5";
import { BsClock, BsCalendarCheck } from "react-icons/bs";
import { HiOutlineDocumentText, HiOutlineChartBar } from "react-icons/hi2";
import { IoMedicalOutline } from "react-icons/io5";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Avatar3D from '@/app/components/Avatar3D';
import ChatBox from '@/app/components/ChatBox';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';



export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosage: '',
    total_amount: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [savingMedication, setSavingMedication] = useState(false);
  const [medicationError, setMedicationError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const router = useRouter();

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
    
    // Fetch appointments data
    if (currentUser.email) {
      await loadAppointments(currentUser.email);
      await loadMedications(currentUser.email);
    }
    
    setLoading(false);
  };

  const loadMedications = async (email: string) => {
    try {
      const { data: medicationsData, error } = await getMedicationsByEmail(email);
      if (!error && medicationsData) {
        setMedications(medicationsData);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const handleAddMedication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingMedication(true);
    setMedicationError(null);

    if (!user?.email) {
      setMedicationError('User not authenticated');
      setSavingMedication(false);
      return;
    }

    if (!medicationForm.name || !medicationForm.dosage || !medicationForm.total_amount || !medicationForm.start_date) {
      setMedicationError('Please fill in all fields');
      setSavingMedication(false);
      return;
    }

    try {
      const { data, error } = await addMedicationByEmail(user.email, {
        name: medicationForm.name,
        dosage: medicationForm.dosage,
        total_amount: parseInt(medicationForm.total_amount),
        start_date: medicationForm.start_date
      });

      if (error) {
        setMedicationError(error.message || 'Failed to add medication');
        setSavingMedication(false);
        return;
      }

      // Reload medications
      await loadMedications(user.email);
      
      // Reset form and close modal
      setMedicationForm({
        name: '',
        dosage: '',
        total_amount: '',
        start_date: new Date().toISOString().split('T')[0]
      });
      setIsMedicationModalOpen(false);
      setSavingMedication(false);
    } catch (error: any) {
      setMedicationError(error.message || 'Failed to add medication');
      setSavingMedication(false);
    }
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate which dates should show medication dots and which are end dates
  const getMedicationDates = () => {
    const medicationDates = new Set<string>(); // Dates with medication (for dots)
    const endDates = new Set<string>(); // Dates when medication runs out (for red highlight)

    medications.forEach((med) => {
      if (!med.start_date) return;

      // Parse start_date (should be in YYYY-MM-DD format)
      const startDateParts = med.start_date.split('-');
      const startDate = new Date(
        parseInt(startDateParts[0]),
        parseInt(startDateParts[1]) - 1,
        parseInt(startDateParts[2])
      );
      
      // Calculate end date: start_date + (total_amount - 1) days (assuming once daily)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + med.total_amount - 1);

      // Add all dates from start to end for dots
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatDateString(currentDate);
        medicationDates.add(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Mark end date for red highlight
      const endDateStr = formatDateString(endDate);
      endDates.add(endDateStr);
    });

    return { medicationDates, endDates };
  };

  const { medicationDates, endDates } = getMedicationDates();

  // Calculate which medication is running out soonest
  const getNextExpiringMedication = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let soonestMedication: Medication | null = null;
    let soonestDays = Infinity;

    medications.forEach((med) => {
      if (!med.start_date) return;

      const startDateParts = med.start_date.split('-');
      const startDate = new Date(
        parseInt(startDateParts[0]),
        parseInt(startDateParts[1]) - 1,
        parseInt(startDateParts[2])
      );
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + med.total_amount - 1);
      endDate.setHours(0, 0, 0, 0);

      // Only consider medications that haven't expired yet
      if (endDate >= today) {
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < soonestDays) {
          soonestDays = daysUntilExpiry;
          soonestMedication = med;
        }
      }
    });

    return { medication: soonestMedication, daysUntilExpiry: soonestDays };
  };

  const expiringMedicationData = getNextExpiringMedication();
  const nextExpiringMed = expiringMedicationData.medication;
  const daysUntilExpiry = expiringMedicationData.daysUntilExpiry;

  const handleRequestRefill = () => {
    setSnackbarOpen(true);
  };

  // Custom tile content for calendar - add red dots and highlight end dates
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateStr = formatDateString(date);
    const hasMedication = medicationDates.has(dateStr);
    const isEndDate = endDates.has(dateStr);

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {hasMedication && !isEndDate && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
        )}
      </div>
    );
  };

  // Custom tile className for highlighting end dates
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateStr = formatDateString(date);
    const isEndDate = endDates.has(dateStr);

    if (isEndDate) {
      return 'medication-end-date';
    }

    return null;
  };

  const loadAppointments = async (email: string) => {
    try {
      // Get all appointments for total count
      const { data: allAppointments, error: allError } = await getAppointmentsByEmail(email);
      if (!allError && allAppointments) {
        setAppointments(allAppointments);
        setTotalAppointments(allAppointments.length);
      }

      // Get upcoming appointments (next 5)
      const { data: upcoming, error: upcomingError } = await getUpcomingAppointmentsByEmail(email, 5);
      if (!upcomingError && upcoming) {
        setUpcomingAppointments(upcoming);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
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
    // Time is in HH:MM format, convert to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
            <Link
              href="/patient/profile"
              className="w-10 h-10 rounded-full bg-[#4A7C7E] flex items-center justify-center text-white font-semibold hover:bg-[#3A6C6E] transition-colors font-inter cursor-pointer"
              title="Profile"
            >
              {(user?.user_metadata?.name || 'P').charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-[#2D3748] mb-2 font-poppins">
            Welcome back, {user?.user_metadata?.name || 'Patient'}
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            Your health dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-[#D4E4DD] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#4A7C7E]">
                <BsCalendarCheck />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#2D3748] mb-1 font-poppins">{totalAppointments}</div>
            <div className="text-sm text-[#64748B] font-inter">Total Appointments</div>
          </div>

          <div className="bg-white rounded-xl border border-[#D4E4DD] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#4A7C7E]">
                <HiOutlineDocumentText />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#2D3748] mb-1 font-poppins">{appointments.filter(a => a.soap_notes).length}</div>
            <div className="text-sm text-[#64748B] font-inter">Medical Records</div>
          </div>

          <div className="bg-white rounded-xl border border-[#D4E4DD] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#4A7C7E]">
                <HiOutlineChartBar />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#2D3748] mb-1 font-poppins">
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const pastAppointments = appointments.filter(a => a.appointment_date < today);
                if (pastAppointments.length > 0) {
                  // Get the most recent past appointment (last in ascending order)
                  return formatDate(pastAppointments[pastAppointments.length - 1].appointment_date);
                }
                return '—';
              })()}
            </div>
            <div className="text-sm text-[#64748B] font-inter">Last Visit</div>
          </div>
        </div>

        {/* Upcoming Appointments Section */}
        <div className="bg-white rounded-xl border border-[#D4E4DD] p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
              <BsClock className="text-[#4A7C7E]" />
              Upcoming Appointments
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/patient/appointments"
                className="text-sm text-[#64748B] hover:text-[#2D3748] transition-colors font-inter"
              >
                View all →
              </Link>
              <Link
                href="/patient/appointments/create"
                className="px-4 py-2 bg-[#4A7C7E] text-white rounded-lg font-medium hover:bg-[#3A6C6E] transition-colors font-inter text-sm flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <IoAddCircleOutline className="text-lg" />
                Create Appointment
              </Link>
            </div>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12 text-[#64748B] font-inter">
              <IoCalendarOutline className="text-5xl mx-auto mb-4 text-[#D4E4DD]" />
              <p className="mb-2 font-medium">No upcoming appointments</p>
              <p className="text-sm">Schedule an appointment to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="group relative bg-gradient-to-br from-white to-[#FAF7F2] border border-[#D4E4DD] rounded-xl p-5 hover:border-[#4A7C7E] hover:shadow-md transition-all duration-200 cursor-pointer"
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
                  
                  {/* Date & Time */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCalendarOutline className="text-[#4A7C7E] text-lg" />
                      <p className="font-semibold text-[#2D3748] font-poppins text-lg">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <BsClock className="text-sm" />
                      <p className="font-medium font-inter">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Location */}
                  {appointment.location && (
                    <div className="flex items-start gap-2 pt-4 border-t border-[#D4E4DD]">
                      <IoLocationOutline className="text-[#64748B] text-base mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[#64748B] font-inter leading-relaxed">
                        {appointment.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Hover effect indicator */}
                  {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9B8FB8] to-[#8B7FA8] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div> */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medication Tracker Section */}
        <div className="bg-white rounded-xl border border-[#D4E4DD] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins flex items-center gap-2">
              <IoMedicalOutline className="text-[#4A7C7E]" />
              Medication Tracker
            </h2>
            <button onClick={() => setIsMedicationModalOpen(true)} className="px-4 py-2 bg-[#4A7C7E] text-white rounded-lg font-medium hover:bg-[#3A6C6E] transition-colors font-inter text-sm flex items-center gap-2 shadow-sm hover:shadow-md">
              <IoAddCircleOutline className="text-lg" />
              Add Medication
            </button>
          </div>

          {/* Medication Countdown and Refill Request */}
          {nextExpiringMed !== null && daysUntilExpiry !== Infinity && (() => {
            const med = nextExpiringMed as Medication;
            return (
              <div className="mb-6 p-4 bg-[#F5F9F7] rounded-xl border border-[#D4E4DD] flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] font-inter mb-1">
                    {daysUntilExpiry === 0 
                      ? `${med.name} runs out today`
                      : daysUntilExpiry === 1
                      ? `1 day until ${med.name} runs out`
                      : `${daysUntilExpiry} days until ${med.name} runs out`
                    }
                  </p>
                  <p className="text-xs text-[#64748B] font-inter">
                    {med.dosage} • {med.total_amount} total
                  </p>
                </div>
                <button
                  onClick={handleRequestRefill}
                  className="px-4 py-2 bg-[#6B9080] text-white rounded-lg font-medium hover:bg-[#5A7A6D] transition-colors font-inter text-sm shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  Request Refill
                </button>
              </div>
            );
          })()}
          
          <Calendar
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              } else if (Array.isArray(value) && value[0] instanceof Date) {
                setSelectedDate(value[0]);
              }
            }}
            value={selectedDate}
            className="react-calendar w-full"
            calendarType="gregory"
            tileContent={tileContent}
            tileClassName={tileClassName}
          />
        </div>
      </main>

      {/* Medication Modal */}
      {isMedicationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#2D3748] font-poppins">Add Medication</h2>
              <button
                onClick={() => setIsMedicationModalOpen(false)}
                className="text-[#64748B] hover:text-[#2D3748] transition-colors text-2xl p-2 hover:bg-[#F5F9F7] rounded-lg"
              >
                <IoClose />
              </button>
            </div>

            {medicationError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-inter">
                {medicationError}
              </div>
            )}

            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label htmlFor="medication-name" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="medication-name"
                  type="text"
                  value={medicationForm.name}
                  onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent bg-white font-inter"
                  placeholder="e.g., Ibuprofen"
                  required
                />
              </div>

              <div>
                <label htmlFor="medication-dosage" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  Dosage <span className="text-red-500">*</span>
                </label>
                <input
                  id="medication-dosage"
                  type="text"
                  value={medicationForm.dosage}
                  onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent bg-white font-inter"
                  placeholder="e.g., 200mg, 2 pills"
                  required
                />
              </div>

              <div>
                <label htmlFor="medication-amount" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  Total Amount <span className="text-red-500">*</span>
                </label>
                <input
                  id="medication-amount"
                  type="number"
                  min="1"
                  value={medicationForm.total_amount}
                  onChange={(e) => setMedicationForm({ ...medicationForm, total_amount: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent bg-white font-inter"
                  placeholder="e.g., 30"
                  required
                />
                <p className="text-xs text-[#64748B] mt-1 font-inter">Total number of pills/units (assuming once daily)</p>
              </div>

              <div>
                <label htmlFor="medication-start-date" className="block text-sm font-medium text-[#2D3748] mb-2 font-inter">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="medication-start-date"
                  type="date"
                  value={medicationForm.start_date}
                  onChange={(e) => setMedicationForm({ ...medicationForm, start_date: e.target.value })}
                  className="w-full px-4 py-3 border border-[#D4E4DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9080] focus:border-transparent bg-white font-inter"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMedicationModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white text-[#2D3748] rounded-xl font-medium border-2 border-[#D4E4DD] hover:border-[#B8D4CC] hover:bg-[#F5F9F7] transition-all font-inter"
                  disabled={savingMedication}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMedication}
                  className="flex-1 px-4 py-3 bg-[#6B9080] text-white rounded-xl font-medium hover:bg-[#5A7A6D] transition-all font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingMedication && <ButtonLoadingSpinner />}
                  {savingMedication ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snackbar for refill request */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success"
          sx={{ 
            backgroundColor: '#4A7C7E',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          Refill request sent
        </Alert>
      </Snackbar>

      {/* Chat Box - Above Avatar */}
      <ChatBox />
      {/* 3D Avatar - Bottom Right */}
      <div className="fixed bottom-4 right-10 rounded-full bg-gray-200 w-36 h-36 shadow-2xl shadow-black/40 overflow-hidden">
        {/* <Avatar3D container={true} /> */}
        <img src="/Avatar.png" alt="Avatar" className="w-full h-full translate-y-2 translate-x-0.5 object-cover" />
      </div>
    </div>
  );
}

