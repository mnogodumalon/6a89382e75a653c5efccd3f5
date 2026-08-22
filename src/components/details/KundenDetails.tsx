import type { Kunden, Reparaturauftraege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KundenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kunden;
  /** 1:N „Reparaturaufträge" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  reparaturauftraegeList: Reparaturauftraege[];
  /** Zeilen-Klick → overlay.push auf das Reparaturauftraege-Detail (nie der Edit-Dialog). */
  onOpenReparaturauftraege: (record: Reparaturauftraege) => void;
  /** Kontextuelles „+": öffnet den Reparaturauftraege-Dialog mit diesem Record vorgesetzt. */
  onAddReparaturauftraege: () => void;
}

export function KundenDetails({
  record,
  reparaturauftraegeList,
  onOpenReparaturauftraege,
  onAddReparaturauftraege,
}: KundenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kunden', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('kunden', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('kunden', 'telefonnummer')} value={record.fields.telefonnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 'email')} value={record.fields.email} format="email" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('reparaturauftraege')}
        items={reparaturauftraegeList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.fahrrad_beschreibung ?? appLabel('reparaturauftraege'), meta: r.fields.abgabedatum })}
        onOpen={onOpenReparaturauftraege}
        onAdd={onAddReparaturauftraege}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KUNDEN} recordId={record.record_id} />
    </>
  );
}
