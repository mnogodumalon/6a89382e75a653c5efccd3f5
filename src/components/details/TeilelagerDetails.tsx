import type { Teilelager } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface TeilelagerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Teilelager;
}

export function TeilelagerDetails({
  record,
}: TeilelagerDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilelager', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('teilelager', 'lagerbestand')} value={record.fields.lagerbestand} format="text" />
        <RecordField label={fieldLabel('teilelager', 'preis')} value={record.fields.preis} format="text" />
        <RecordField label={fieldLabel('teilelager', 'mindestbestand')} value={record.fields.mindestbestand} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.TEILELAGER} recordId={record.record_id} />
    </>
  );
}
