'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { getAppointmentsByEmail, getUpcomingAppointmentsByEmail, Appointment } from '@/lib/patients';
import { FullPageLoading } from '@/app/components/LoadingSpinner';
import { IoCalendarOutline, IoAddCircleOutline, IoLocationOutline } from "react-icons/io5";
import { BsClock, BsCalendarCheck } from "react-icons/bs";
import { HiOutlineDocumentText, HiOutlineChartBar } from "react-icons/hi2";
import Avatar3D from '@/app/components/Avatar3D';
import ChatBox from '@/app/components/ChatBox';


export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
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
    }
    
    setLoading(false);
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
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 border-b border-[#E2E8F0] bg-white">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Lunari Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold text-[#1E293B] font-poppins">Lunari</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/patient/profile"
              className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-semibold hover:bg-[#1E293B] transition-colors font-inter cursor-pointer"
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
          <h1 className="text-4xl font-light text-[#0F172A] mb-2 font-poppins">
            Welcome back, {user?.user_metadata?.name || 'Patient'}
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            Your health dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#CBD5E1]">
                <BsCalendarCheck />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">{totalAppointments}</div>
            <div className="text-sm text-[#64748B] font-inter">Total Appointments</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#CBD5E1]">
                <HiOutlineDocumentText />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">{appointments.filter(a => a.soap_notes).length}</div>
            <div className="text-sm text-[#64748B] font-inter">Medical Records</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#CBD5E1]">
                <HiOutlineChartBar />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">
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
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#0F172A] font-poppins flex items-center gap-2">
              <BsClock className="text-[#0F172A]" />
              Upcoming Appointments
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/patient/appointments"
                className="text-sm text-[#64748B] hover:text-[#0F172A] transition-colors font-inter"
              >
                View all →
              </Link>
              <Link
                href="/patient/appointments/create"
                className="px-4 py-2 bg-[#0F172A] text-white rounded-lg font-medium hover:bg-[#1E293B] transition-colors font-inter text-sm flex items-center gap-2"
              >
                <IoAddCircleOutline className="text-lg" />
                Create Appointment
              </Link>
            </div>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12 text-[#64748B] font-inter">
              <IoCalendarOutline className="text-5xl mx-auto mb-4 text-[#CBD5E1]" />
              <p className="mb-2 font-medium">No upcoming appointments</p>
              <p className="text-sm">Schedule an appointment to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="group relative bg-gradient-to-br from-white to-[#FAFAF9] border border-[#E2E8F0] rounded-xl p-5 hover:border-[#CBD5E1] hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Status Badge */}
                  {appointment.status && (
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-inter ${
                        appointment.status === 'scheduled' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : appointment.status === 'completed'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {/* Date & Time */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCalendarOutline className="text-[#0F172A] text-lg" />
                      <p className="font-semibold text-[#0F172A] font-poppins text-lg">
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
                    <div className="flex items-start gap-2 pt-4 border-t border-[#E2E8F0]">
                      <IoLocationOutline className="text-[#64748B] text-base mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-[#64748B] font-inter leading-relaxed">
                        {appointment.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Hover effect indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Medical Records Section */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#0F172A] font-poppins flex items-center gap-2">
              <HiOutlineDocumentText className="text-[#0F172A]" />
              Recent Medical Records
            </h2>
            <Link
              href="/patient/history"
              className="text-sm text-[#64748B] hover:text-[#0F172A] transition-colors font-inter"
            >
              View all →
            </Link>
          </div>
          <div className="text-center py-12 text-[#64748B] font-inter">
            <HiOutlineDocumentText className="text-5xl mx-auto mb-4 text-[#CBD5E1]" />
            <p className="mb-2 font-medium">No medical records yet</p>
            <p className="text-sm">Start a new intake session to create your first record</p>
          </div>
          {/* Example record card (commented out for now) */}
          {/*
          <div className="border border-[#E2E8F0] rounded-lg p-4 mb-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-[#0F172A] mb-1 font-inter">Intake Session</h3>
                <p className="text-sm text-[#64748B] font-inter">Jan 10, 2025 at 2:30 PM</p>
              </div>
              <span className="px-2 py-1 bg-[#F0F9FF] text-[#0369A1] rounded text-xs font-inter">SOAP Note</span>
            </div>
            <p className="text-sm text-[#64748B] font-inter line-clamp-2">
              Patient reported symptoms of headache and fatigue. Assessment indicates...
            </p>
          </div>
          */}
        </div>
      </main>
      {/* Chat Box - Above Avatar */}
      <ChatBox />
      {/* 3D Avatar - Bottom Right */}
      <div className="fixed bottom-4 right-10 rounded-full bg-gray-200 w-36 h-36 shadow-2xl shadow-black/40 overflow-hidden">
        <Avatar3D container={true} />
      </div>
    </div>
  );
}

