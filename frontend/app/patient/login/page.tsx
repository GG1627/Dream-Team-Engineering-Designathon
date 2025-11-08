'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { patientLogin } from '@/lib/auth';
import { ButtonLoadingSpinner } from '@/app/components/LoadingSpinner';

export default function PatientLoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    // Patient login: tries to login, if account doesn't exist, requires name to create one
    const { data, error: authError } = await patientLogin(email, name || undefined);

    if (authError) {
      setError(authError.message || 'Login failed. Please try again.');
      setLoading(false);
      return;
    }

    // Success! Redirect to patient dashboard
    router.push('/patient/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/Logo.png"
              alt="Lunari Logo"
              width={60}
              height={60}
              className="rounded-lg"
            />
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2 text-center font-poppins">
          Patient Login
        </h1>
        <p className="text-sm text-[#64748B] mb-8 text-center font-inter">
          Enter your email to login. New patients will need to provide their name.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-inter">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
              Name <span className="text-[#64748B] text-xs">(required for new accounts)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
              placeholder="Your Name (optional for existing accounts)"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-2 font-inter">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent font-inter"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-[#0F172A] text-white rounded-xl font-medium hover:bg-[#1E293B] transition-all shadow-sm hover:shadow-lg font-inter disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <ButtonLoadingSpinner />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-[#64748B] font-inter">
          <Link href="/" className="hover:text-[#0F172A] transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
