import React from 'react';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { Header } from '@/components/layout/Header';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <AppRouter />
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          CloudShare &copy; {new Date().getFullYear()} &mdash; Phase 3 Authentication Foundation
        </footer>
      </div>
    </AppProviders>
  );
};

export default App;
