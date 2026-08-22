import type { Leihvorgaenge, Leihraeder, Kunden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface LeihvorgaengeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leihvorgaenge;
  /** N:1-Ziel „Leihraeder": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  leihraederList: Leihraeder[];
  /** Klick auf die Leihraeder-Relation → overlay.push auf dessen Detail. */
  onOpenLeihraeder?: (record: Leihraeder) => void;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
}

export function LeihvorgaengeDetails({
  record,
  leihraederList,
  onOpenLeihraeder,
  kundenList,
  onOpenKunden,
}: LeihvorgaengeDetailsProps) {
  const leihradTarget = leihraederList.find(r => r.record_id === extractRecordId(record.fields.leihrad));
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leihvorgaenge', 'startdatum')} value={record.fields.startdatum} format="date" />
        <RecordField label={fieldLabel('leihvorgaenge', 'enddatum')} value={record.fields.enddatum} format="date" />
        <RecordField label={fieldLabel('leihvorgaenge', 'bild_vorher')} className="md:col-span-2">
          {record.fields.bild_vorher ? (
            <MediaThumbnail src={record.fields.bild_vorher as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('leihvorgaenge', 'zustand_vorher')} value={record.fields.zustand_vorher} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leihvorgaenge', 'bild_nachher')} className="md:col-span-2">
          {record.fields.bild_nachher ? (
            <MediaThumbnail src={record.fields.bild_nachher as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('leihvorgaenge', 'zustand_nachher')} value={record.fields.zustand_nachher} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leihvorgaenge', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('leihvorgaenge', 'leihrad')}
          name={leihradTarget?.fields.rahmennummer ?? '—'}
          meta={undefined}
          onClick={leihradTarget && onOpenLeihraeder ? () => onOpenLeihraeder!(leihradTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('leihvorgaenge', 'kunde')}
          name={kundeTarget?.fields.vorname ?? '—'}
          meta={[kundeTarget?.fields.telefonnummer, kundeTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.LEIHVORGAENGE} recordId={record.record_id} />
    </>
  );
}
