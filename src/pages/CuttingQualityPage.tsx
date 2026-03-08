import { Shield } from 'lucide-react';
import { CUTTING_QUALITY_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function CuttingQualityPage() {
  return (
    <MISSectionPage
      sectionKey="cutting_quality"
      sectionLabel="Cutting Quality Activities"
      sectionIcon={Shield}
      configs={CUTTING_QUALITY_CONFIGS}
    />
  );
}
