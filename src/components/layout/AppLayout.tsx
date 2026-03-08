import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { NavTabs } from './NavTabs';
import { ContextSidebar, getDefaultFilter } from './ContextSidebar';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';

// Route-level access control: minimum role required to access each route
const ROUTE_MIN_ROLES: Record<string, AppRole> = {
  '/admin/settings': 'admin',
  '/admin/factories': 'admin',
  '/admin/users': 'admin',
  '/plans': 'line_chief',
  '/plans/new': 'manager',
  '/hourly-entry': 'line_chief',
  '/workers': 'manager',
  '/inventory': 'manager',
  '/shipments': 'manager',
  '/analytics': 'manager',
  '/mis': 'manager',
  '/planning': 'manager',
};

export function AppLayout() {
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const location = useLocation();
  const { hasMinRole } = useUserRole();

  // Auto-select first factory
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

  // Reset filter when route changes
  useEffect(() => {
    setActiveFilter(getDefaultFilter(location.pathname));
  }, [location.pathname]);

  // Route-level access check
  const currentPath = location.pathname;
  for (const [routePrefix, minRole] of Object.entries(ROUTE_MIN_ROLES)) {
    if (currentPath === routePrefix || currentPath.startsWith(routePrefix + '/')) {
      if (!hasMinRole(minRole)) {
        return <Navigate to="/dashboard" replace />;
      }
      break;
    }
  }

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
              factoryId={selectedFactoryId}
            />
            <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5">
              <Outlet context={{ activeFilter, factoryId: selectedFactoryId }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
