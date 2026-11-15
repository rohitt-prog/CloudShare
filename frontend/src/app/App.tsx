import React from 'react';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background text-foreground">
        <AppRouter />
      </div>
    </AppProviders>
  );
};

export default App;
