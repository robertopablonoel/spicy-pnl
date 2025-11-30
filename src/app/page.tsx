import { PLViewer } from "@/components/pnl/PLViewer";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Spicy Cubes
              </h1>
              <p className="text-sm text-slate-500">
                Profit & Loss Statement - January to November 2025
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                Data as of Nov 30, 2025
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <PLViewer />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            P&L Viewer for Investor Presentations
          </p>
        </div>
      </footer>
    </div>
  );
}
