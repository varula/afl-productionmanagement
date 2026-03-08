import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { NavTabs } from './NavTabs';
import { ContextSidebar, getDefaultFilter } from './ContextSidebar';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout() {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const location = useLocation();

  const { data: factories } = useQuery({
    queryKey: ['factories-init'],
    queryFn: async () => {
      const { data } = await supabase.from('factories').select('id').order('name').limit(1);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!selectedFactoryId && factories && factories.length > 0) {
      setSelectedFactoryId(factories[0].id);
    }
  }, [factories, selectedFactoryId]);

  useEffect(() => {
    setActiveFilter(getDefaultFilter(location.pathname));
  }, [location.pathname]);

  return (
    <div className="flex w-full min-h-screen bg-background">
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 bg-card flex flex-col overflow-hidden">
          <TopBar
            selectedFactoryId={selectedFactoryId}
            onFactoryChange={setSelectedFactoryId}
          />
          <NavTabs />
          <div className="flex flex-1 overflow-hidden">
            <ContextSidebar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              factoryId={selectedFactoryId}
            />
            <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-background/50">
              <Outlet context={{ activeFilter, factoryId: selectedFactoryId }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
