import { Building } from 'lucide-react';
import { GENERAL_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function GeneralActivitiesPage() {
  return (
    <MISSectionPage
      sectionKey="general"
      sectionLabel="General Activities"
      sectionIcon={Building}
      configs={GENERAL_CONFIGS}
    />
  );
}
