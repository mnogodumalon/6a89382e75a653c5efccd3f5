/**
 * Auftrag abschliessen — 2-Schritt-Wizard.
 * Steps: 1) Fertigen Reparaturauftrag auswaehlen → 2) Bestaetigen & als abgeholt markieren.
 * Reads: reparaturauftraege, kunden (via kundenMap). Writes: reparaturauftraege (updateReparaturauftraegeEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichReparaturauftraege } from '@/lib/enrich';
import type { EnrichedReparaturauftraege } from '@/types/enriched';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { IconCheck, IconBike, IconUser, IconCalendar, IconTool } from '@tabler/icons-react';

export default function AuftragAbschliessenPage() {
  const data = useDashboardData();
  const { reparaturauftraege, kundenMap, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedAuftrag, setSelectedAuftrag] = useState<EnrichedReparaturauftraege | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const enriched = enrichReparaturauftraege(reparaturauftraege, { kundenMap });
  const fertigeAuftraege = enriched.filter(r => lookupKey(r.fields.status) === 'fertig');

  const handleSelectAuftrag = (id: string) => {
    const found = fertigeAuftraege.find(r => r.record_id === id) ?? null;
    setSelectedAuftrag(found);
    setStep(2);
  };

  const handleAbschliessen = async () => {
    if (!selectedAuftrag) return;
    setSubmitting(true);
    try {
      await LivingAppsService.updateReparaturauftraegeEntry(selectedAuftrag.record_id, {
        status: 'abgeholt',
      });
      await fetchAll();
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAuftrag(null);
    setDone(false);
    setStep(1);
  };

  return (
    <IntentWizardShell
      title={tx('Auftrag abschliessen')}
      subtitle={tx('Fertigen Reparaturauftrag als abgeholt markieren')}
      steps={[{ label: tx('Auftrag wählen') }, { label: tx('Bestätigen') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <EntitySelectStep
          items={fertigeAuftraege.map(r => ({
            id: r.record_id,
            title: r.fields.fahrrad_beschreibung ?? tx('Unbekanntes Fahrrad'),
            subtitle: r.kundeName,
            status: r.fields.status
              ? { key: r.fields.status.key, label: r.fields.status.label }
              : undefined,
            stats: r.fields.abgabedatum
              ? [{ label: tx('Abgabedatum'), value: formatDate(r.fields.abgabedatum) }]
              : [],
            icon: <IconBike size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectAuftrag}
          searchPlaceholder={tx('Auftrag suchen …')}
          emptyText={tx('Keine fertigen Aufträge vorhanden')}
          emptyIcon={<IconBike size={48} className="text-muted-foreground" />}
        />
      )}

      {step === 2 && (
        selectedAuftrag ? (
          done ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
                <IconCheck size={36} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{tx('Auftrag abgeschlossen')}</h2>
                <p className="text-sm text-muted-foreground">
                  {tx('Das Fahrrad wurde als abgeholt markiert.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="outline" onClick={handleReset}>
                  {tx('Weiteren Auftrag abschliessen')}
                </Button>
                <a href="#/">
                  <Button>{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold">{tx('Auftragsdetails')}</h2>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <IconUser size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{tx('Kunde')}</p>
                      <p className="font-medium truncate">{selectedAuftrag.kundeName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <IconBike size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{tx('Fahrrad')}</p>
                      <p className="font-medium truncate">
                        {selectedAuftrag.fields.fahrrad_beschreibung ?? '—'}
                      </p>
                    </div>
                  </div>
                  {selectedAuftrag.fields.problembeschreibung && (
                    <div className="flex items-start gap-3">
                      <IconTool size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tx('Problembeschreibung')}</p>
                        <p className="text-sm">{selectedAuftrag.fields.problembeschreibung}</p>
                      </div>
                    </div>
                  )}
                  {selectedAuftrag.fields.abgabedatum && (
                    <div className="flex items-start gap-3">
                      <IconCalendar size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tx('Abgabedatum')}</p>
                        <p className="font-medium">{formatDate(selectedAuftrag.fields.abgabedatum)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {tx('Zurück')}
                </Button>
                <Button
                  onClick={handleAbschliessen}
                  disabled={submitting}
                  className="flex-1 sm:flex-none"
                >
                  <IconCheck size={16} className="shrink-0" />
                  {submitting ? tx('Wird gespeichert …') : tx('Als abgeholt markieren')}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
