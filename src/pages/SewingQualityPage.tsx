import { Shield } from 'lucide-react';
import { SEWING_QUALITY_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function SewingQualityPage() {
  return (
    <MISSectionPage
      sectionKey="sewing_quality"
      sectionLabel="Sewing Quality Activities"
      sectionIcon={Shield}
      configs={SEWING_QUALITY_CONFIGS}
    />
  );
}
