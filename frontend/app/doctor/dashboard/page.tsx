'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { FullPageLoading } from '@/app/components/LoadingSpinner';

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
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
            <span className="text-sm text-[#64748B] font-inter">
              {user?.user_metadata?.name || 'Doctor'}
            </span>
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
      <main className="container mx-auto max-w-7xl px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-light text-[#0F172A] mb-2 font-poppins">
            Welcome, {user?.user_metadata?.name || 'Doctor'}
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            View patient records and manage medical documentation
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="text-2xl font-semibold text-[#0F172A] mb-1 font-poppins">0</div>
            <div className="text-sm text-[#64748B] font-inter">Total Patients</div>
          </div>
          <div className="p-6 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="text-2xl font-semibold text-[#0F172A] mb-1 font-poppins">0</div>
            <div className="text-sm text-[#64748B] font-inter">Records Today</div>
          </div>
          <div className="p-6 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="text-2xl font-semibold text-[#0F172A] mb-1 font-poppins">0</div>
            <div className="text-sm text-[#64748B] font-inter">Pending Reviews</div>
          </div>
        </div>

        {/* Patients Section */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#0F172A] font-poppins">
              Patient Records
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search patients..."
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter text-sm"
              />
            </div>
          </div>
          <div className="text-center py-12 text-[#64748B] font-inter">
            <p className="mb-2">No patient records yet</p>
            <p className="text-sm">Patient records will appear here once they create intake sessions</p>
          </div>
        </div>
      </main>
    </div>
  );
}

