import type { Lager } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface LagerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Lager;
}

export function LagerDetails({
  record,
}: LagerDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('lager', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('lager', 'lagerbestand')} value={record.fields.lagerbestand} format="text" />
        <RecordField label={fieldLabel('lager', 'preis')} value={record.fields.preis} format="text" />
        <RecordField label={fieldLabel('lager', 'mindestbestand')} value={record.fields.mindestbestand} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.LAGER} recordId={record.record_id} />
    </>
  );
}
