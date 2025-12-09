'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VideoPage() {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const apiToken = process.env.NEXT_PUBLIC_DATA_API_TOKEN || 'dev-token';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-slate-900/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dataroom"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Data Room</span>
            </Link>
            <span className="text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              Confidential
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Founder Walkthrough
              </h1>
            </div>
            <p className="text-slate-400 text-sm">
              5-minute overview of the business, systems, and opportunity
            </p>
          </div>

          {/* Video Player */}
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
            <video
              controls
              className="w-full aspect-video"
              poster=""
              preload="metadata"
            >
              <source src={`/api/data?file=video&token=${apiToken}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video Chapters */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Topics Covered</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { time: '0:00', topic: 'Introduction & Origin Story' },
                { time: '0:45', topic: 'Unit Economics & Margins' },
                { time: '1:30', topic: 'Creator Engine Overview' },
                { time: '2:30', topic: 'Key Metrics & Performance' },
                { time: '3:15', topic: 'Proprietary Software Demo' },
                { time: '4:30', topic: 'Growth Levers & Opportunity' },
              ].map((chapter, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded-lg">
                  <span className="text-violet-400 font-mono text-sm">{chapter.time}</span>
                  <span className="text-slate-300 text-sm">{chapter.topic}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center gap-4">
            <Link
              href="/dataroom/overview"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Read Full Presentation
            </Link>
            <Link
              href="/dataroom/financials"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-full font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Financials
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-12">
          <p className="text-slate-600 text-xs">
            Confidential - For Qualified Buyers Under NDA Only
          </p>
        </footer>
      </main>
    </div>
  );
}
