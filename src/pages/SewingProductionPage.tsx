import { Shirt } from 'lucide-react';
import { SEWING_PRODUCTION_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function SewingProductionPage() {
  return (
    <MISSectionPage
      sectionKey="sewing_production"
      sectionLabel="Sewing Production Activities"
      sectionIcon={Shirt}
      configs={SEWING_PRODUCTION_CONFIGS}
    />
  );
}
