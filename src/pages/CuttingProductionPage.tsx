import { Scissors } from 'lucide-react';
import { CUTTING_PRODUCTION_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function CuttingProductionPage() {
  return (
    <MISSectionPage
      sectionKey="cutting_production"
      sectionLabel="Cutting Production Activities"
      sectionIcon={Scissors}
      configs={CUTTING_PRODUCTION_CONFIGS}
    />
  );
}
