import { FileCheck } from 'lucide-react';
import { PRE_PRODUCTION_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function PreProductionPage() {
  return (
    <MISSectionPage
      sectionKey="pre_production"
      sectionLabel="Pre-Production Activities"
      sectionIcon={FileCheck}
      configs={PRE_PRODUCTION_CONFIGS}
    />
  );
}
