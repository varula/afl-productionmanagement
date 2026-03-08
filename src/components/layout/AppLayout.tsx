import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { NavTabs } from './NavTabs';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useState } from 'react';

export function AppLayout() {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen app-bg-gradient">
          <div className="m-3 md:m-4 flex-1 bg-card rounded-[22px] shadow-[0_20px_80px_rgba(30,40,100,0.15)] flex flex-col overflow-hidden">
            <div className="flex items-center">
              <SidebarTrigger className="ml-3 shrink-0" />
              <div className="flex-1">
                <TopBar
                  selectedFactoryId={selectedFactoryId}
                  onFactoryChange={setSelectedFactoryId}
                />
              </div>
            </div>
            <NavTabs />
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
