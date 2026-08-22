import type { Reparaturauftraege, Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface ReparaturauftraegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Reparaturauftraege;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
}

export function ReparaturauftraegeDetails({
  record,
  kundenList,
  onOpenKunden,
}: ReparaturauftraegeDetailsProps) {
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('reparaturauftraege', 'kostenvoranschlag')} value={record.fields.kostenvoranschlag} format="text" />
        <RecordField label={fieldLabel('reparaturauftraege', 'fahrrad_beschreibung')} value={record.fields.fahrrad_beschreibung} format="text" />
        <RecordField label={fieldLabel('reparaturauftraege', 'problembeschreibung')} value={record.fields.problembeschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('reparaturauftraege', 'abgabedatum')} value={record.fields.abgabedatum} format="date" />
        <RecordField label={fieldLabel('reparaturauftraege', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('reparaturauftraege', 'kunde')}
          name={kundeTarget?.fields.vorname ?? '—'}
          meta={[kundeTarget?.fields.telefonnummer, kundeTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.REPARATURAUFTRAEGE} recordId={record.record_id} />
    </>
  );
}
