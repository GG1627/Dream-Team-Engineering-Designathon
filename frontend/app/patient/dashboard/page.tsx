'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, logout } from '@/lib/auth';
import { FullPageLoading } from '@/app/components/LoadingSpinner';

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
              {user?.user_metadata?.name || 'Patient'}
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
            Welcome back, {user?.user_metadata?.name || 'Patient'}
          </h1>
          <p className="text-lg text-[#64748B] font-inter">
            Manage your medical records and start new intake sessions
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/patient/intake"
            className="p-8 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-lg transition-all group"
          >
            <div className="text-4xl mb-4">🎙️</div>
            <h2 className="text-2xl font-semibold text-[#0F172A] mb-2 font-poppins group-hover:text-[#1E293B] transition-colors">
              New Intake Session
            </h2>
            <p className="text-[#64748B] font-inter">
              Record your symptoms and generate SOAP notes
            </p>
          </Link>

          <div className="p-8 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-[#0F172A] mb-2 font-poppins">
              View History
            </h2>
            <p className="text-[#64748B] font-inter">
              View your past medical records and SOAP notes
            </p>
          </div>
        </div>

        {/* Recent Records Section */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8">
          <h2 className="text-2xl font-semibold text-[#0F172A] mb-6 font-poppins">
            Recent Records
          </h2>
          <div className="text-center py-12 text-[#64748B] font-inter">
            <p className="mb-2">No records yet</p>
            <p className="text-sm">Start a new intake session to create your first record</p>
          </div>
        </div>
      </main>
    </div>
  );
}

