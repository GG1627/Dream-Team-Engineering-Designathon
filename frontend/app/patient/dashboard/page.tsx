'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { FullPageLoading } from '@/app/components/LoadingSpinner';
import { IoCalendarOutline, IoAddCircleOutline } from "react-icons/io5";
import { BsClock, BsCalendarCheck } from "react-icons/bs";
import { HiOutlineDocumentText, HiOutlineChartBar } from "react-icons/hi2";


export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
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
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">0</div>
            <div className="text-sm text-[#64748B] font-inter">Total Appointments</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#CBD5E1]">
                <HiOutlineDocumentText />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">0</div>
            <div className="text-sm text-[#64748B] font-inter">Medical Records</div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl text-[#CBD5E1]">
                <HiOutlineChartBar />
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0F172A] mb-1 font-poppins">—</div>
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
          <div className="text-center py-12 text-[#64748B] font-inter">
            <IoCalendarOutline className="text-5xl mx-auto mb-4 text-[#CBD5E1]" />
            <p className="mb-2 font-medium">No upcoming appointments</p>
            <p className="text-sm">Schedule an appointment to get started</p>
          </div>
          {/* Example appointment card (commented out for now) */}
          {/* 
          <div className="border border-[#E2E8F0] rounded-lg p-4 mb-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-[#0F172A] mb-1 font-inter">Dr. Smith</h3>
                <p className="text-sm text-[#64748B] font-inter">General Checkup</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-[#0F172A] font-inter">Jan 15, 2025</p>
                <p className="text-sm text-[#64748B] font-inter">10:00 AM</p>
              </div>
            </div>
          </div>
          */}
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
    </div>
  );
}

