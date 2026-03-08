import { Warehouse } from 'lucide-react';
import { STORES_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function StoresActivitiesPage() {
  return (
    <MISSectionPage
      sectionKey="stores"
      sectionLabel="Stores Activities"
      sectionIcon={Warehouse}
      configs={STORES_CONFIGS}
    />
  );
}
