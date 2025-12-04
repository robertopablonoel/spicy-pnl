import Link from "next/link";
import { PLViewer } from "@/components/pnl/PLViewer";

export default function PLPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-xl font-bold text-slate-900">
                Profit & Loss Statement
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                Jan - Nov 2025
              </span>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                Updated Nov 30
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto px-6 py-8">
        <PLViewer allowDrillDown={false} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            Confidential - For Investor Review Only
          </p>
        </div>
      </footer>
    </div>
  );
}
