/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kunden'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kunden.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kunden.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kunden.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kunden              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kunden: vorname, nachname, telefonnummer, email  ·  ← reparaturauftraege (list + contextual +)
 *   reparaturauftraege: kunde, fahrrad_beschreibung, problembeschreibung, abgabedatum, status  ·  → kunden
 *   ersatzteile: bezeichnung, lagerbestand, preis
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kunden, Reparaturauftraege, Ersatzteile } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichReparaturauftraege } from '@/lib/enrich';
import type { EnrichedReparaturauftraege } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { ReparaturauftraegeDialog, type ReparaturauftraegeDialogDefaults } from '@/components/dialogs/ReparaturauftraegeDialog';
import { ReparaturauftraegeDetails } from '@/components/details/ReparaturauftraegeDetails';
import { ErsatzteileDialog, type ErsatzteileDialogDefaults } from '@/components/dialogs/ErsatzteileDialog';
import { ErsatzteileDetails } from '@/components/details/ErsatzteileDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kunden'; record: Kunden }
  | { type: 'reparaturauftraege'; record: EnrichedReparaturauftraege }
  | { type: 'ersatzteile'; record: Ersatzteile };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  reparaturauftraege: EntityCrudApi<Reparaturauftraege, ReparaturauftraegeDialogDefaults>;
  ersatzteile: EntityCrudApi<Ersatzteile, ErsatzteileDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kunden: Kunden[]; reparaturauftraege: EnrichedReparaturauftraege[]; ersatzteile: Ersatzteile[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [reparaturauftraegeDialog, setReparaturauftraegeDialog] = useState<{ defaults?: ReparaturauftraegeDialogDefaults; editing?: Reparaturauftraege } | null>(null);
  const [ersatzteileDialog, setErsatzteileDialog] = useState<{ defaults?: ErsatzteileDialogDefaults; editing?: Ersatzteile } | null>(null);
  const enrichedReparaturauftraege = useMemo(() => enrichReparaturauftraege(data.reparaturauftraege, { kundenMap: data.kundenMap }), [data.reparaturauftraege, data.kundenMap]);

  function detailKunden(record: Kunden, push = false) {
    const item: OverlayItem = { type: 'kunden', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKunden(fields: Kunden['fields']) {
    const editing = kundenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKunden(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKundenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kunden')} — ${t('crud_updated')}`, async () => {
        data.setKunden(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKundenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKundenEntry(fields);
      undoToast(`${appLabel('kunden')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailReparaturauftraege(record: Reparaturauftraege, push = false) {
    const rec = enrichedReparaturauftraege.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'reparaturauftraege', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitReparaturauftraege(fields: Reparaturauftraege['fields']) {
    const editing = reparaturauftraegeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setReparaturauftraege(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateReparaturauftraegeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('reparaturauftraege')} — ${t('crud_updated')}`, async () => {
        data.setReparaturauftraege(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateReparaturauftraegeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createReparaturauftraegeEntry(fields);
      undoToast(`${appLabel('reparaturauftraege')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailErsatzteile(record: Ersatzteile, push = false) {
    const item: OverlayItem = { type: 'ersatzteile', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitErsatzteile(fields: Ersatzteile['fields']) {
    const editing = ersatzteileDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setErsatzteile(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateErsatzteileEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('ersatzteile')} — ${t('crud_updated')}`, async () => {
        data.setErsatzteile(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateErsatzteileEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createErsatzteileEntry(fields);
      undoToast(`${appLabel('ersatzteile')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KundenDialog
        open={kundenDialog !== null}
        onClose={() => setKundenDialog(null)}
        onSubmit={submitKunden}
        defaultValues={kundenDialog?.defaults}
        recordId={kundenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />
      <ReparaturauftraegeDialog
        open={reparaturauftraegeDialog !== null}
        onClose={() => setReparaturauftraegeDialog(null)}
        onSubmit={submitReparaturauftraege}
        defaultValues={reparaturauftraegeDialog?.defaults}
        recordId={reparaturauftraegeDialog?.editing?.record_id}
        kundenList={data.kunden}
        enablePhotoScan={AI_PHOTO_SCAN['Reparaturauftraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reparaturauftraege']}
      />
      <ErsatzteileDialog
        open={ersatzteileDialog !== null}
        onClose={() => setErsatzteileDialog(null)}
        onSubmit={submitErsatzteile}
        defaultValues={ersatzteileDialog?.defaults}
        recordId={ersatzteileDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Ersatzteile']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ersatzteile']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kunden')} subtitle={undefined} />
                <KundenDetails
                  record={top.record}
                  reparaturauftraegeList={data.reparaturauftraege}
                  onOpenReparaturauftraege={(r) => detailReparaturauftraege(r, true)}
                  onAddReparaturauftraege={() => setReparaturauftraegeDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'reparaturauftraege') {
            return (
              <>
                <RecordHeader title={top.record.fields.fahrrad_beschreibung ?? appLabel('reparaturauftraege')} subtitle={top.record.fields.abgabedatum ? formatDate(top.record.fields.abgabedatum) : undefined} />
                <ReparaturauftraegeDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                />
              </>
            );
          }
          if (top.type === 'ersatzteile') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('ersatzteile')} subtitle={undefined} />
                <ErsatzteileDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'reparaturauftraege') setReparaturauftraegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'ersatzteile') setErsatzteileDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kunden: {
      openCreate: (defaults?: KundenDialogDefaults) => setKundenDialog({ defaults }),
      openEdit: (record: Kunden) => setKundenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kunden) => detailKunden(record, false),
    },
    reparaturauftraege: {
      openCreate: (defaults?: ReparaturauftraegeDialogDefaults) => setReparaturauftraegeDialog({ defaults }),
      openEdit: (record: Reparaturauftraege) => setReparaturauftraegeDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Reparaturauftraege) => detailReparaturauftraege(record, false),
    },
    ersatzteile: {
      openCreate: (defaults?: ErsatzteileDialogDefaults) => setErsatzteileDialog({ defaults }),
      openEdit: (record: Ersatzteile) => setErsatzteileDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Ersatzteile) => detailErsatzteile(record, false),
    },
    enriched: { kunden: data.kunden, reparaturauftraege: enrichedReparaturauftraege, ersatzteile: data.ersatzteile },
  };
}
