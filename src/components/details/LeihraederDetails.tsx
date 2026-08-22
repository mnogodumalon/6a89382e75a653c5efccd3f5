import type { Leihraeder, Kunden, Leihvorgaenge } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface LeihraederDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leihraeder;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
  /** 1:N „Leihvorgänge" (leihrad): VOLLE Liste — der Block filtert auf diesen Record. */
  leihvorgaengeList: Leihvorgaenge[];
  /** Zeilen-Klick → overlay.push auf das Leihvorgaenge-Detail (nie der Edit-Dialog). */
  onOpenLeihvorgaenge: (record: Leihvorgaenge) => void;
  /** Kontextuelles „+": öffnet den Leihvorgaenge-Dialog mit diesem Record vorgesetzt. */
  onAddLeihvorgaenge: () => void;
}

export function LeihraederDetails({
  record,
  kundenList,
  onOpenKunden,
  leihvorgaengeList,
  onOpenLeihvorgaenge,
  onAddLeihvorgaenge,
}: LeihraederDetailsProps) {
  const verliehen_anTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.verliehen_an));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leihraeder', 'bild_fahrrad')} className="md:col-span-2">
          {record.fields.bild_fahrrad ? (
            <MediaThumbnail src={record.fields.bild_fahrrad as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
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

      <SatelliteSection
        title={appLabel('leihvorgaenge')}
        items={leihvorgaengeList.filter(r => extractRecordId(r.fields.leihrad) === record.record_id)}
        map={r => ({ name: appLabel('leihvorgaenge'), meta: r.fields.startdatum })}
        onOpen={onOpenLeihvorgaenge}
        onAdd={onAddLeihvorgaenge}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LEIHRAEDER} recordId={record.record_id} />
    </>
  );
}
