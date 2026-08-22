import type { Ersatzteile } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface ErsatzteileDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Ersatzteile;
}

export function ErsatzteileDetails({
  record,
}: ErsatzteileDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('ersatzteile', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('ersatzteile', 'lagerbestand')} value={record.fields.lagerbestand} format="text" />
        <RecordField label={fieldLabel('ersatzteile', 'preis')} value={record.fields.preis} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ERSATZTEILE} recordId={record.record_id} />
    </>
  );
}
