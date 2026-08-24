import { useMemo, useState, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { tx, appLabel } from '@/i18n';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatDate, formatCurrency } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { format, parseISO, isToday, isBefore, addDays } from 'date-fns';
import {
  IconAlertTriangle,
  IconCheck,
  IconBike,
  IconTool,
  IconPackage,
  IconCalendar,
} from '@tabler/icons-react';

function toneForStatus(status: string | undefined): KanbanTone {
  if (status === 'fertig') return 'success';
  if (status === 'in_arbeit') return 'primary';
  if (status === 'abgeholt') return 'default';
  return 'warning'; // angenommen → needs attention
}

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    reparaturauftraege, setReparaturauftraege,
    lager,
    leihraeder,
    leihvorgaenge,
    loading, error, fetchAll,
  } = data;

  const clock = useClock();

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'reparaturauftraege') return undefined;
      const r = top.record;
      const status = lookupKey(r.fields.status);
      if (status === 'angenommen') return {
        label: tx('In Arbeit setzen'),
        onClick: () => void advanceStatus(r.record_id, 'in_arbeit'),
      };
      if (status === 'in_arbeit') return {
        label: tx('Als fertig markieren'),
        onClick: () => void advanceStatus(r.record_id, 'fertig'),
      };
      if (status === 'fertig') return {
        label: tx('Als abgeholt markieren'),
        onClick: () => void advanceStatus(r.record_id, 'abgeholt'),
      };
      return undefined;
    },
  });

  const enrichedReparaturauftraege = crud.enriched.reparaturauftraege;

  const advanceStatus = useCallback(async (recordId: string, newStatus: string) => {
    const prev = reparaturauftraege.find(r => r.record_id === recordId);
    if (!prev) return;
    const prevStatus = prev.fields.status;
    setReparaturauftraege(list =>
      list.map(r =>
        r.record_id === recordId
          ? { ...r, fields: { ...r.fields, status: lookupOption('reparaturauftraege', 'status', newStatus) } }
          : r,
      ),
    );
    const statusLabel = lookupOption('reparaturauftraege', 'status', newStatus).label;
    undoToast(
      tx`Status auf ${statusLabel} gesetzt`,
      async () => {
        setReparaturauftraege(list =>
          list.map(r =>
            r.record_id === recordId
              ? { ...r, fields: { ...r.fields, status: prevStatus } }
              : r,
          ),
        );
        await LivingAppsService.updateReparaturauftraegeEntry(recordId, { status: typeof prevStatus === 'object' && prevStatus !== null ? (prevStatus as { key: string }).key : undefined });
      },
    );
    try {
      await LivingAppsService.updateReparaturauftraegeEntry(recordId, { status: newStatus });
    } catch {
      await fetchAll();
    }
  }, [reparaturauftraege, setReparaturauftraege, fetchAll]);

  // ─── All hooks above this line ───
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;
  // ─── Plain derivations below ───

  const today = format(clock, 'yyyy-MM-dd');

  const statusCounts = {
    angenommen: enrichedReparaturauftraege.filter(r => lookupKey(r.fields.status) === 'angenommen').length,
    in_arbeit: enrichedReparaturauftraege.filter(r => lookupKey(r.fields.status) === 'in_arbeit').length,
    fertig: enrichedReparaturauftraege.filter(r => lookupKey(r.fields.status) === 'fertig').length,
  };

  // Aufträge die fertig sind und noch nicht abgeholt
  const fertigNichtAbgeholt = enrichedReparaturauftraege.filter(r => lookupKey(r.fields.status) === 'fertig');

  // Überfällig = Abgabedatum vergangen und noch nicht fertig/abgeholt
  const ueberfaellig = enrichedReparaturauftraege.filter(r => {
    const st = lookupKey(r.fields.status);
    if (st === 'fertig' || st === 'abgeholt') return false;
    const ab = r.fields.abgabedatum;
    if (!ab) return false;
    return ab < today;
  });

  // Heute + die nächsten 3 Tage fällig
  const bald = enrichedReparaturauftraege.filter(r => {
    const st = lookupKey(r.fields.status);
    if (st === 'fertig' || st === 'abgeholt') return false;
    const ab = r.fields.abgabedatum;
    if (!ab) return false;
    const abDate = ab.slice(0, 10);
    const in3Days = format(addDays(clock, 3), 'yyyy-MM-dd');
    return abDate >= today && abDate <= in3Days;
  }).sort((a, b) => (a.fields.abgabedatum ?? '').localeCompare(b.fields.abgabedatum ?? ''));

  // Ersatzteile mit niedrigem Lagerbestand (≤5 Stück)
  const tiefstand = lager.filter(e => (e.fields.lagerbestand ?? 0) <= 5).sort((a, b) => (a.fields.lagerbestand ?? 0) - (b.fields.lagerbestand ?? 0));

  // Leihräder
  const leihraederVerliehen = leihraeder.filter(l => !!l.fields.verliehen_an);
  const leihraederVerfuegbar = leihraeder.filter(l => !l.fields.verliehen_an);

  // Leihvorgänge
  const leihvorgaengeAktiv = leihvorgaenge.filter(l => lookupKey(l.fields.status) === 'aktiv');
  const leihvorgaengeUeberfaellig = leihvorgaenge.filter(l => lookupKey(l.fields.status) === 'ueberfaellig');

  // KanbanColumns inside body (locale-aware getter)
  const COLUMNS = (LOOKUP_OPTIONS['reparaturauftraege']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })) as KanbanColumn[];

  const cards: KanbanCard[] = enrichedReparaturauftraege.map(r => {
    const status = lookupKey(r.fields.status) ?? COLUMNS[0]?.key ?? '';
    const isUeberfaellig = ueberfaellig.some(u => u.record_id === r.record_id);
    return {
      id: `auftrag:${r.record_id}`,
      column: status,
      title: r.kundeName || r.fields.fahrrad_beschreibung || tx('Auftrag'),
      subtitle: r.fields.abgabedatum
        ? (isUeberfaellig
          ? tx`Fällig: ${formatDate(r.fields.abgabedatum)} ⚠`
          : tx`Fällig: ${formatDate(r.fields.abgabedatum)}`)
        : (r.fields.fahrrad_beschreibung ?? undefined),
      tone: isUeberfaellig ? 'destructive' : toneForStatus(status),
    };
  }).sort((a, b) => {
    const ra = enrichedReparaturauftraege.find(r => `auftrag:${r.record_id}` === a.id);
    const rb = enrichedReparaturauftraege.find(r => `auftrag:${r.record_id}` === b.id);
    return (ra?.fields.abgabedatum ?? '').localeCompare(rb?.fields.abgabedatum ?? '');
  });

  const moveCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    await advanceStatus(rid, newColumn);
  };

  // Kontext-Satz
  const aktivNamen = enrichedReparaturauftraege
    .filter(r => lookupKey(r.fields.status) === 'in_arbeit')
    .map(r => r.kundeName || r.fields.fahrrad_beschreibung || '')
    .filter(Boolean);

  const kontextSatz = aktivNamen.length > 0
    ? tx`In Arbeit: ${namen(aktivNamen)}.`
    : enrichedReparaturauftraege.length === 0
      ? tx('Noch keine Aufträge — leg den ersten an.')
      : tx('Alle Aufträge im Blick.');

  const heroBanner = ueberfaellig.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: tx('In Arbeit setzen'),
        onClick: () => void advanceStatus(ueberfaellig[0].record_id, 'in_arbeit'),
      }}
    >
      <b>{namen(ueberfaellig.map(r => r.kundeName || r.fields.fahrrad_beschreibung || ''))}</b>
      {ueberfaellig.length === 1
        ? tx` — Auftrag überfällig seit ${formatDate(ueberfaellig[0].fields.abgabedatum)}.`
        : tx` — ${ueberfaellig.length} Aufträge überfällig.`}
    </HeroBanner>
  ) : fertigNichtAbgeholt.length > 0 ? (
    <HeroBanner
      icon={<IconCheck size={18} />}
      action={{
        label: tx('Als abgeholt markieren'),
        onClick: () => void advanceStatus(fertigNichtAbgeholt[0].record_id, 'abgeholt'),
      }}
    >
      {fertigNichtAbgeholt.length === 1
        ? tx`Fahrrad von ${fertigNichtAbgeholt[0].kundeName || fertigNichtAbgeholt[0].fields.fahrrad_beschreibung || ''} ist fertig — Kunde benachrichtigen?`
        : tx`${fertigNichtAbgeholt.length} Fahrräder fertig zur Abholung.`}
    </HeroBanner>
  ) : undefined;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-muted-foreground">{kontextSatz}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          onClick={() => crud.reparaturauftraege.openCreate({ status: 'angenommen' })}
        >
          <IconTool size={16} className="shrink-0" />
          <span>{tx('Neuer Auftrag')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Angenommen')}
              value={statusCounts.angenommen}
              icon={<IconBike size={16} />}
              tone={statusCounts.angenommen > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('In Arbeit')}
              value={statusCounts.in_arbeit}
              icon={<IconTool size={16} />}
              tone={statusCounts.in_arbeit > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Fertig')}
              value={statusCounts.fertig}
              icon={<IconCheck size={16} />}
              tone={statusCounts.fertig > 0 ? 'success' : 'default'}
            />
            <StatStripItem
              title={tx('Überfällig')}
              value={ueberfaellig.length}
              icon={<IconAlertTriangle size={16} />}
              tone={ueberfaellig.length > 0 ? 'destructive' : 'default'}
            />
            <StatStripItem
              title={tx('Leihräder verliehen')}
              value={leihraederVerliehen.length}
              icon={<IconBike size={16} />}
              tone={leihraederVerliehen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Leihräder verfügbar')}
              value={leihraederVerfuegbar.length}
              icon={<IconBike size={16} />}
              tone={leihraederVerfuegbar.length > 0 ? 'success' : 'default'}
            />
            <StatStripItem
              title={tx('Leihvorgänge aktiv')}
              value={leihvorgaengeAktiv.length}
              icon={<IconCalendar size={16} />}
              tone={leihvorgaengeAktiv.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Leihvorgänge überfällig')}
              value={leihvorgaengeUeberfaellig.length}
              icon={<IconAlertTriangle size={16} />}
              tone={leihvorgaengeUeberfaellig.length > 0 ? 'destructive' : 'default'}
            />
          </StatStrip>
        }
        primary={
          enrichedReparaturauftraege.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <IconBike size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-lg font-semibold">{tx('Noch keine Reparaturaufträge')}</p>
              <p className="text-muted-foreground text-sm">{tx('Leg den ersten Auftrag an, um loszulegen.')}</p>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => crud.reparaturauftraege.openCreate({ status: 'angenommen' })}
              >
                <IconTool size={16} />
                {tx('Ersten Auftrag anlegen')}
              </button>
            </div>
          ) : (
            <KanbanWidget
              cards={cards}
              columns={COLUMNS}
              defaultCollapsed={['abgeholt']}
              onCardClick={(card) => {
                const rid = card.id.split(':')[1];
                const r = reparaturauftraege.find(x => x.record_id === rid);
                if (r) crud.reparaturauftraege.openDetail(r);
              }}
              onCardMove={moveCard}
              onAddCard={(column) => crud.reparaturauftraege.openCreate({ status: column })}
            />
          )
        }
        aside={
          <>
            <WorkList
              title={tx('Bald fällig')}
              items={bald.map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.fahrrad_beschreibung || tx('Auftrag'),
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">
                      {isToday(parseISO(r.fields.abgabedatum!))
                        ? tx('Heute fällig')
                        : formatDate(r.fields.abgabedatum)}
                    </span>
                    {r.fields.fahrrad_beschreibung && (
                      <span className="text-muted-foreground"> · {r.fields.fahrrad_beschreibung}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('In Arbeit'),
                  onClick: () => void advanceStatus(r.record_id, 'in_arbeit'),
                },
              }))}
              onItemClick={(id) => {
                const r = reparaturauftraege.find(x => x.record_id === id);
                if (r) crud.reparaturauftraege.openDetail(r);
              }}
              empty={{
                text: tx('Kein Termin in den nächsten 3 Tagen.'),
                action: { label: tx('Neuer Auftrag'), onClick: () => crud.reparaturauftraege.openCreate({ status: 'angenommen' }) },
              }}
            />
            <WorkList
              title={tx('Ersatzteile — Tiefstand')}
              items={tiefstand.map(e => ({
                id: e.record_id,
                title: e.fields.bezeichnung || tx('Ersatzteil'),
                secondLine: (
                  <>
                    <span className={`font-medium ${(e.fields.lagerbestand ?? 0) === 0 ? 'text-destructive' : 'text-amber-600'}`}>
                      {(e.fields.lagerbestand ?? 0) === 0
                        ? tx('Nicht vorrätig')
                        : tx`Noch ${e.fields.lagerbestand ?? 0} Stück`}
                    </span>
                    {e.fields.preis != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(e.fields.preis)}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Bestand'),
                  onClick: () => crud.lager.openEdit(e),
                },
              }))}
              onItemClick={(id) => {
                const e = lager.find(x => x.record_id === id);
                if (e) crud.lager.openDetail(e);
              }}
              empty={{
                text: tx('Alle Ersatzteile gut vorrätig.'),
                action: { label: tx('Ersatzteil anlegen'), onClick: () => crud.lager.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Leihräder — Verliehen')}
              items={leihraederVerliehen.map(l => ({
                id: l.record_id,
                title: l.fields.rahmennummer || tx('Leihrad'),
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{tx('Verliehen')}</span>
                    {l.fields.tagespreis != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(l.fields.tagespreis)}{tx('/Tag')}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Ansehen'),
                  onClick: () => crud.leihraeder.openDetail(l),
                },
              }))}
              onItemClick={(id) => {
                const l = leihraeder.find(x => x.record_id === id);
                if (l) crud.leihraeder.openDetail(l);
              }}
              empty={{
                text: tx('Alle Leihräder verfügbar.'),
                action: { label: tx('Leihrad anlegen'), onClick: () => crud.leihraeder.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Leihvorgänge — Aktiv & Überfällig')}
              items={[...leihvorgaengeUeberfaellig, ...leihvorgaengeAktiv].map(l => ({
                id: l.record_id,
                title: l.fields.enddatum
                  ? tx`bis ${formatDate(l.fields.enddatum)}`
                  : tx('Leihvorgang'),
                secondLine: (
                  <>
                    <span className={`font-medium ${lookupKey(l.fields.status) === 'ueberfaellig' ? 'text-destructive' : 'text-amber-600'}`}>
                      {lookupKey(l.fields.status) === 'ueberfaellig' ? tx('Überfällig') : tx('Aktiv')}
                    </span>
                    {l.fields.startdatum && (
                      <span className="text-muted-foreground"> · {tx`ab ${formatDate(l.fields.startdatum)}`}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Ansehen'),
                  onClick: () => crud.leihvorgaenge.openDetail(l),
                },
              }))}
              onItemClick={(id) => {
                const l = leihvorgaenge.find(x => x.record_id === id);
                if (l) crud.leihvorgaenge.openDetail(l);
              }}
              empty={{
                text: tx('Keine aktiven Leihvorgänge.'),
                action: { label: tx('Leihvorgang anlegen'), onClick: () => crud.leihvorgaenge.openCreate({}) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
