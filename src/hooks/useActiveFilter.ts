import { useOutletContext } from 'react-router-dom';

interface OutletContext {
  activeFilter: string;
  factoryId: string;
}

export function useActiveFilter(): string {
  const ctx = useOutletContext<OutletContext>();
  return ctx?.activeFilter ?? '';
}

export function useFactoryId(): string {
  const ctx = useOutletContext<OutletContext>();
  return ctx?.factoryId ?? '';
}
