import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <Topbar />
      <main className="flex-1 p-5 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
