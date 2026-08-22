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
 *     footer: (top) => top.type === 'leihraeder'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.leihraeder.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.leihraeder.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.leihraeder.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.leihraeder              // the display-ready array for EVERY entity —
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
 *   leihraeder: rahmennummer, groesse, tagespreis, verliehen_an  ·  → kunden
 *   kunden: vorname, nachname, telefonnummer, email, stammkunde  ·  ← leihraeder (list + contextual +) · ← reparaturauftraege (list + contextual +)
 *   reparaturauftraege: kunde, fahrrad_beschreibung, problembeschreibung, abgabedatum, status  ·  → kunden
 *   teilelager: bezeichnung, lagerbestand, preis, mindestbestand
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Leihraeder, Kunden, Reparaturauftraege, Teilelager } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichLeihraeder, enrichReparaturauftraege } from '@/lib/enrich';
import type { EnrichedLeihraeder, EnrichedReparaturauftraege } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { LeihraederDialog, type LeihraederDialogDefaults } from '@/components/dialogs/LeihraederDialog';
import { LeihraederDetails } from '@/components/details/LeihraederDetails';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { ReparaturauftraegeDialog, type ReparaturauftraegeDialogDefaults } from '@/components/dialogs/ReparaturauftraegeDialog';
import { ReparaturauftraegeDetails } from '@/components/details/ReparaturauftraegeDetails';
import { TeilelagerDialog, type TeilelagerDialogDefaults } from '@/components/dialogs/TeilelagerDialog';
import { TeilelagerDetails } from '@/components/details/TeilelagerDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'leihraeder'; record: EnrichedLeihraeder }
  | { type: 'kunden'; record: Kunden }
  | { type: 'reparaturauftraege'; record: EnrichedReparaturauftraege }
  | { type: 'teilelager'; record: Teilelager };

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
  leihraeder: EntityCrudApi<Leihraeder, LeihraederDialogDefaults>;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  reparaturauftraege: EntityCrudApi<Reparaturauftraege, ReparaturauftraegeDialogDefaults>;
  teilelager: EntityCrudApi<Teilelager, TeilelagerDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { leihraeder: EnrichedLeihraeder[]; kunden: Kunden[]; reparaturauftraege: EnrichedReparaturauftraege[]; teilelager: Teilelager[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [leihraederDialog, setLeihraederDialog] = useState<{ defaults?: LeihraederDialogDefaults; editing?: Leihraeder } | null>(null);
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [reparaturauftraegeDialog, setReparaturauftraegeDialog] = useState<{ defaults?: ReparaturauftraegeDialogDefaults; editing?: Reparaturauftraege } | null>(null);
  const [teilelagerDialog, setTeilelagerDialog] = useState<{ defaults?: TeilelagerDialogDefaults; editing?: Teilelager } | null>(null);
  const enrichedLeihraeder = useMemo(() => enrichLeihraeder(data.leihraeder, { kundenMap: data.kundenMap }), [data.leihraeder, data.kundenMap]);
  const enrichedReparaturauftraege = useMemo(() => enrichReparaturauftraege(data.reparaturauftraege, { kundenMap: data.kundenMap }), [data.reparaturauftraege, data.kundenMap]);

  function detailLeihraeder(record: Leihraeder, push = false) {
    const rec = enrichedLeihraeder.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'leihraeder', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLeihraeder(fields: Leihraeder['fields']) {
    const editing = leihraederDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLeihraeder(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLeihraederEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('leihraeder')} — ${t('crud_updated')}`, async () => {
        data.setLeihraeder(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLeihraederEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLeihraederEntry(fields);
      undoToast(`${appLabel('leihraeder')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

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

  function detailTeilelager(record: Teilelager, push = false) {
    const item: OverlayItem = { type: 'teilelager', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTeilelager(fields: Teilelager['fields']) {
    const editing = teilelagerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTeilelager(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTeilelagerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('teilelager')} — ${t('crud_updated')}`, async () => {
        data.setTeilelager(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTeilelagerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTeilelagerEntry(fields);
      undoToast(`${appLabel('teilelager')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <LeihraederDialog
        open={leihraederDialog !== null}
        onClose={() => setLeihraederDialog(null)}
        onSubmit={submitLeihraeder}
        defaultValues={leihraederDialog?.defaults}
        recordId={leihraederDialog?.editing?.record_id}
        kundenList={data.kunden}
        enablePhotoScan={AI_PHOTO_SCAN['Leihraeder']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leihraeder']}
      />
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
      <TeilelagerDialog
        open={teilelagerDialog !== null}
        onClose={() => setTeilelagerDialog(null)}
        onSubmit={submitTeilelager}
        defaultValues={teilelagerDialog?.defaults}
        recordId={teilelagerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Teilelager']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Teilelager']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'leihraeder') {
            return (
              <>
                <RecordHeader title={top.record.fields.rahmennummer ?? appLabel('leihraeder')} subtitle={undefined} />
                <LeihraederDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                />
              </>
            );
          }
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kunden')} subtitle={undefined} />
                <KundenDetails
                  record={top.record}
                  leihraederList={data.leihraeder}
                  onOpenLeihraeder={(r) => detailLeihraeder(r, true)}
                  onAddLeihraeder={() => setLeihraederDialog({ defaults: { verliehen_an: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
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
          if (top.type === 'teilelager') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('teilelager')} subtitle={undefined} />
                <TeilelagerDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'leihraeder') setLeihraederDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'reparaturauftraege') setReparaturauftraegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'teilelager') setTeilelagerDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    leihraeder: {
      openCreate: (defaults?: LeihraederDialogDefaults) => setLeihraederDialog({ defaults }),
      openEdit: (record: Leihraeder) => setLeihraederDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Leihraeder) => detailLeihraeder(record, false),
    },
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
    teilelager: {
      openCreate: (defaults?: TeilelagerDialogDefaults) => setTeilelagerDialog({ defaults }),
      openEdit: (record: Teilelager) => setTeilelagerDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Teilelager) => detailTeilelager(record, false),
    },
    enriched: { leihraeder: enrichedLeihraeder, kunden: data.kunden, reparaturauftraege: enrichedReparaturauftraege, teilelager: data.teilelager },
  };
}
