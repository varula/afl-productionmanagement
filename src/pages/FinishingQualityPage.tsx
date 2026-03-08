import { ClipboardCheck } from 'lucide-react';
import { FINISHING_QUALITY_CONFIGS } from '@/lib/mis-form-configs';
import MISSectionPage from './MISSectionPage';

export default function FinishingQualityPage() {
  return (
    <MISSectionPage
      sectionKey="finishing_quality"
      sectionLabel="Finishing Quality Activities"
      sectionIcon={ClipboardCheck}
      configs={FINISHING_QUALITY_CONFIGS}
    />
  );
}
