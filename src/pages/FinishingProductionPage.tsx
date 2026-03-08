import { PackageCheck } from 'lucide-react';
import { FINISHING_PRODUCTION_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function FinishingProductionPage() {
  return (
    <MISSectionPage
      sectionKey="finishing_production"
      sectionLabel="Finishing Production Activities"
      sectionIcon={PackageCheck}
      configs={FINISHING_PRODUCTION_CONFIGS}
    />
  );
}
