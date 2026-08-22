import type { Leihraeder, Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface LeihraederDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leihraeder;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
}

export function LeihraederDetails({
  record,
  kundenList,
  onOpenKunden,
}: LeihraederDetailsProps) {
  const verliehen_anTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.verliehen_an));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leihraeder', 'rahmennummer')} value={record.fields.rahmennummer} format="text" />
        <RecordField label={fieldLabel('leihraeder', 'groesse')} value={record.fields.groesse} format="pill" />
        <RecordField label={fieldLabel('leihraeder', 'tagespreis')} value={record.fields.tagespreis} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('leihraeder', 'verliehen_an')}
          name={verliehen_anTarget?.fields.vorname ?? '—'}
          meta={[verliehen_anTarget?.fields.telefonnummer, verliehen_anTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={verliehen_anTarget && onOpenKunden ? () => onOpenKunden!(verliehen_anTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.LEIHRAEDER} recordId={record.record_id} />
    </>
  );
}
