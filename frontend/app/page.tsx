'use client';

import Image from "next/image";
import Link from "next/link";
import LiquidEther from "./components/LiquidEther";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F9F7]">
      {/* Subtle LiquidEther Background */}
      <div className="fixed inset-0 z-0 opacity-15">
        <LiquidEther
          colors={['#000000', '#000000', '#000000', '#000000']}
          resolution={0.5}
          mouseForce={15}
          cursorSize={100}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.5}
          className="h-full w-full"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Simple Navigation */}
        <nav className="w-full px-8 py-6">
          <div className="container mx-auto max-w-6xl flex items-center justify-between">
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
          </div>
        </nav>

        {/* Main Content - Centered */}
        <main className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="container mx-auto max-w-4xl text-center">
            {/* Logo */}
            <div className="mb-8 inline-block">
              <Image
                src="/Logo.png"
                alt="Sana Logo"
                width={200}
                height={200}
                className="mx-auto rounded-2xl"
                priority
              />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-light text-[#2D3748] mb-4 tracking-tight font-poppins">
              Sana
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-[#64748B] mb-16 font-light max-w-2xl mx-auto font-inter">
              AI-Powered Medical Intake Assistant
            </p>

            {/* Login Options */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-md mx-auto">
              <Link
                href="/patient/login"
                className="w-full sm:w-auto px-12 py-4 bg-[#6B9080] text-white rounded-xl font-medium text-lg hover:bg-[#5A7A6D] transition-all shadow-sm hover:shadow-md font-inter"
              >
                Patient Login
              </Link>
              <Link
                href="/doctor/login"
                className="w-full sm:w-auto px-12 py-4 bg-[#FAF7F2] text-[#2D3748] rounded-xl font-medium text-lg border-2 border-[#D4E4DD] hover:border-[#B8D4CC] hover:bg-[#F5F3ED] transition-all shadow-sm hover:shadow-md font-inter"
              >
                Doctor Login
              </Link>
            </div>
          </div>
        </main>

        {/* Simple Footer */}
        <footer className="w-full px-8 py-6 border-t border-[#D4E4DD]">
          <div className="container mx-auto max-w-6xl text-center text-sm text-[#6B7C87] font-inter">
            © 2025 Sana. Powered by AI for better healthcare.
          </div>
        </footer>
      </div>
    </div>
  );
}
