import { useOutletContext } from 'react-router-dom';

interface OutletContext {
  activeFilter: string;
}

export function useActiveFilter(): string {
  const ctx = useOutletContext<OutletContext>();
  return ctx?.activeFilter ?? '';
}
