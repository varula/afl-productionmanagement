import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { NavTabs } from './NavTabs';

export function AppLayout() {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');

  return (
    <div className="fixed inset-0 app-bg-gradient">
      <div className="m-3 md:m-4 h-[calc(100vh-24px)] md:h-[calc(100vh-32px)] bg-card rounded-[22px] shadow-[0_20px_80px_rgba(30,40,100,0.15)] flex flex-col overflow-hidden">
        <TopBar
          selectedFactoryId={selectedFactoryId}
          onFactoryChange={setSelectedFactoryId}
        />
        <NavTabs />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
