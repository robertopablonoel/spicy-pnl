import { PLViewer } from "@/components/pnl/PLViewer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
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
        <PLViewer />
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
