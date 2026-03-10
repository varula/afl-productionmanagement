import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FilterItem {
  id: string;
  group_id: string;
  label: string;
  filter_key: string;
  badge_value: string | null;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface FilterGroup {
  id: string;
  route: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  items: FilterItem[];
}

/** Fetch all filter groups + items for a given route */
export function useSidebarFilters(route: string) {
  return useQuery({
    queryKey: ['sidebar-filters', route],
    queryFn: async () => {
      const { data: groups, error: gErr } = await supabase
        .from('sidebar_filter_groups')
        .select('*')
        .eq('route', route)
        .eq('is_active', true)
        .order('sort_order');
      if (gErr) throw gErr;
      if (!groups || groups.length === 0) return [] as FilterGroup[];

      const groupIds = groups.map(g => g.id);
      const { data: items, error: iErr } = await supabase
        .from('sidebar_filter_items')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .order('sort_order');
      if (iErr) throw iErr;

      return groups.map(g => ({
        ...g,
        items: (items || []).filter(i => i.group_id === g.id),
      })) as FilterGroup[];
    },
    staleTime: 60_000,
  });
}

/** Fetch ALL filter groups (for admin management) */
export function useAllSidebarFilters() {
  return useQuery({
    queryKey: ['sidebar-filters-all'],
    queryFn: async () => {
      const { data: groups, error: gErr } = await supabase
        .from('sidebar_filter_groups')
        .select('*')
        .order('route')
        .order('sort_order');
      if (gErr) throw gErr;

      const { data: items, error: iErr } = await supabase
        .from('sidebar_filter_items')
        .select('*')
        .order('sort_order');
      if (iErr) throw iErr;

      return (groups || []).map(g => ({
        ...g,
        items: (items || []).filter(i => i.group_id === g.id),
      })) as FilterGroup[];
    },
    staleTime: 30_000,
  });
}

/** CRUD mutations for filter groups */
export function useFilterGroupMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sidebar-filters'] });
    qc.invalidateQueries({ queryKey: ['sidebar-filters-all'] });
  };

  const addGroup = useMutation({
    mutationFn: async (data: { route: string; title: string; sort_order: number }) => {
      const { error } = await supabase.from('sidebar_filter_groups').insert(data);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('sidebar_filter_groups').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sidebar_filter_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addGroup, updateGroup, deleteGroup };
}

/** CRUD mutations for filter items */
export function useFilterItemMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sidebar-filters'] });
    qc.invalidateQueries({ queryKey: ['sidebar-filters-all'] });
  };

  const addItem = useMutation({
    mutationFn: async (data: { group_id: string; label: string; filter_key: string; sort_order: number; badge_value?: string; is_default?: boolean }) => {
      const { error } = await supabase.from('sidebar_filter_items').insert(data);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; filter_key?: string; sort_order?: number; badge_value?: string | null; is_default?: boolean; is_active?: boolean }) => {
      const { error } = await supabase.from('sidebar_filter_items').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sidebar_filter_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addItem, updateItem, deleteItem };
}
