'use client';

import { useState, useEffect } from 'react';

const CORRECT_PASSWORD = 'spicypeach';
const STORAGE_KEY = 'pnl-authenticated';

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-900 text-center mb-2">
          Profit & Loss Statement
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Enter password to view
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className={`w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
              error ? 'border-red-300 bg-red-50' : 'border-slate-200'
            }`}
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm mt-2">
              Incorrect password
            </p>
          )}

          <button
            type="submit"
            className="w-full mt-4 bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            View Statement
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Confidential - For Authorized Access Only
        </p>
      </div>
    </div>
  );
}
