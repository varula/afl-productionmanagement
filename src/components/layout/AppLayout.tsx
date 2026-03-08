import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { NavTabs } from './NavTabs';
import { ContextSidebar, getDefaultFilter } from './ContextSidebar';
import { useState, useEffect } from 'react';

export function AppLayout() {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const location = useLocation();

  // Reset filter when route changes
  useEffect(() => {
    setActiveFilter(getDefaultFilter(location.pathname));
  }, [location.pathname]);

  return (
    <div className="flex w-full min-h-screen">
      <div className="flex-1 flex flex-col min-h-screen app-bg-gradient">
        <div className="m-2 md:m-4 flex-1 bg-card rounded-[22px] shadow-[0_20px_80px_rgba(30,40,100,0.15)] flex flex-col overflow-hidden">
          <TopBar
            selectedFactoryId={selectedFactoryId}
            onFactoryChange={setSelectedFactoryId}
          />
          <NavTabs />
          <div className="flex flex-1 overflow-hidden">
            <ContextSidebar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5">
              <Outlet context={{ activeFilter }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
