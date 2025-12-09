'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { PLViewer } from "@/components/pnl/PLViewer";

export default function FinancialsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unlocked = sessionStorage.getItem('dataRoomUnlocked');
    if (unlocked === 'true') {
      setIsAuthorized(true);
    } else {
      router.push('/');
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dataroom"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Data Room</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  Financial Detail
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                TTM: Dec 2024 - Nov 2025
              </span>
              <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                Confidential
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-6 py-8">
        <PLViewer />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            Confidential - For Qualified Buyers Under NDA Only
          </p>
        </div>
      </footer>
    </div>
  );
}
