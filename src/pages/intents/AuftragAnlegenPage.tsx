/**
 * Auftrag Anlegen — 2-Schritt-Wizard.
 * Steps: 1) Kunde auswählen oder neu anlegen → 2) Auftragsdaten erfassen & bestätigen.
 * Reads: kunden. Writes: kunden (createKundenEntry), reparaturauftraege (createReparaturauftraegeEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Kunden } from '@/types/app';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { IconUser, IconBike, IconCircleCheck } from '@tabler/icons-react';

export default function AuftragAnlegenPage() {
  const data = useDashboardData();
  const { kunden, fetchAll, loading, error } = data;

  const [step, setStep] = useState(1);

  // Step 1 — Kunde
  const [selectedKunde, setSelectedKunde] = useState<Kunden | null>(null);
  const [showCreateKunde, setShowCreateKunde] = useState(false);
  const [neuerVorname, setNeuerVorname] = useState('');
  const [neuerNachname, setNeuerNachname] = useState('');
  const [neuerTelefon, setNeuerTelefon] = useState('');
  const [neuerEmail, setNeuerEmail] = useState('');
  const [kundeCreating, setKundeCreating] = useState(false);

  // Step 2 — Auftragsdaten
  const [fahrradBeschreibung, setFahrradBeschreibung] = useState('');
  const [problembeschreibung, setProblembeschreibung] = useState('');
  const [abgabedatum, setAbgabedatum] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSelectKunde = (id: string) => {
    const found = kunden.find(k => k.record_id === id) ?? null;
    setSelectedKunde(found);
    setStep(2);
  };

  const handleCreateKunde = async () => {
    if (!neuerVorname || !neuerNachname) return;
    setKundeCreating(true);
    try {
      const created = await LivingAppsService.createKundenEntry({
        vorname: neuerVorname,
        nachname: neuerNachname,
        telefonnummer: neuerTelefon || undefined,
        email: neuerEmail || undefined,
      });
      await fetchAll();
      setShowCreateKunde(false);
      setNeuerVorname('');
      setNeuerNachname('');
      setNeuerTelefon('');
      setNeuerEmail('');
      // find the newly created record after refresh
      const newKunde: Kunden = {
        record_id: created.record_id,
        created_at: '',
        updated_at: null,
        createdat: '',
        updatedat: null,
        fields: {
          vorname: neuerVorname,
          nachname: neuerNachname,
          telefonnummer: neuerTelefon || undefined,
          email: neuerEmail || undefined,
        },
      };
      setSelectedKunde(newKunde);
      setStep(2);
    } finally {
      setKundeCreating(false);
    }
  };

  const handleSubmitAuftrag = async () => {
    if (!selectedKunde || !fahrradBeschreibung || !abgabedatum) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createReparaturauftraegeEntry({
        kunde: createRecordUrl(APP_IDS.KUNDEN, selectedKunde.record_id),
        fahrrad_beschreibung: fahrradBeschreibung,
        problembeschreibung: problembeschreibung || undefined,
        abgabedatum,
        status: 'angenommen',
      });
      setSuccessId(result.record_id);
      await fetchAll();
    } catch {
      setSubmitError(tx('Fehler beim Anlegen des Auftrags. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedKunde(null);
    setShowCreateKunde(false);
    setFahrradBeschreibung('');
    setProblembeschreibung('');
    setAbgabedatum('');
    setSubmitError(null);
    setSuccessId(null);
  };

  const kundeName = selectedKunde
    ? `${selectedKunde.fields.vorname ?? ''} ${selectedKunde.fields.nachname ?? ''}`.trim()
    : '';

  return (
    <IntentWizardShell
      title={tx('Neuen Auftrag anlegen')}
      subtitle={tx('Wähle einen Kunden und erfasse die Auftragsdaten.')}
      steps={[{ label: tx('Kunde') }, { label: tx('Auftragsdaten') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Kunde auswählen */}
      {step === 1 && (
        <EntitySelectStep
          items={kunden.map(k => ({
            id: k.record_id,
            title: `${k.fields.vorname ?? ''} ${k.fields.nachname ?? ''}`.trim() || k.record_id,
            subtitle: [k.fields.telefonnummer, k.fields.email].filter(Boolean).join(' · '),
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectKunde}
          searchPlaceholder={tx('Nach Name suchen …')}
          createLabel={tx('Neuen Kunden anlegen')}
          onCreateNew={() => setShowCreateKunde(true)}
          emptyText={tx('Kein Kunde gefunden')}
          createDialog={showCreateKunde && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{tx('Neuen Kunden anlegen')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="neu-vorname">{tx('Vorname')} *</Label>
                  <Input
                    id="neu-vorname"
                    value={neuerVorname}
                    onChange={e => setNeuerVorname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="neu-nachname">{tx('Nachname')} *</Label>
                  <Input
                    id="neu-nachname"
                    value={neuerNachname}
                    onChange={e => setNeuerNachname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="neu-telefon">{tx('Telefonnummer')}</Label>
                <Input
                  id="neu-telefon"
                  type="tel"
                  value={neuerTelefon}
                  onChange={e => setNeuerTelefon(e.target.value)}
                  placeholder={tx('z. B. 0176 12345678')}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="neu-email">{tx('E-Mail')}</Label>
                <Input
                  id="neu-email"
                  type="email"
                  value={neuerEmail}
                  onChange={e => setNeuerEmail(e.target.value)}
                  placeholder={tx('beispiel@email.de')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  disabled={!neuerVorname || !neuerNachname || kundeCreating}
                  onClick={handleCreateKunde}
                >
                  {kundeCreating ? tx('Wird angelegt …') : tx('Kunden anlegen')}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateKunde(false)}>
                  {tx('Abbrechen')}
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {/* Step 2: Auftragsdaten erfassen */}
      {step === 2 && (
        selectedKunde ? (
          successId ? (
            /* Erfolgsansicht */
            <div className="flex flex-col items-center text-center py-12 space-y-4">
              <IconCircleCheck size={48} className="text-emerald-500" stroke={1.5} />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{tx('Auftrag erfolgreich angelegt!')}</h2>
                <p className="text-sm text-muted-foreground">
                  {tx('Der Reparaturauftrag für')} <strong>{kundeName}</strong> {tx('wurde mit dem Status „Angenommen" erstellt.')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={handleReset}>{tx('Neuen Auftrag anlegen')}</Button>
                <a href="#/">
                  <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            /* Formular */
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Ausgewählter Kunde */}
              <div className="rounded-2xl border bg-secondary/40 p-4 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <IconUser size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Ausgewählter Kunde')}</p>
                  <p className="font-medium truncate">{kundeName}</p>
                  {selectedKunde.fields.telefonnummer && (
                    <p className="text-xs text-muted-foreground truncate">{selectedKunde.fields.telefonnummer}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => { setSelectedKunde(null); setStep(1); }}
                >
                  {tx('Ändern')}
                </Button>
              </div>

              {/* Auftragsdaten */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <IconBike size={18} className="text-primary shrink-0" />
                  <h2 className="text-sm font-semibold">{tx('Auftragsdaten')}</h2>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fahrrad">{tx('Fahradbeschreibung')} *</Label>
                  <Input
                    id="fahrrad"
                    value={fahrradBeschreibung}
                    onChange={e => setFahrradBeschreibung(e.target.value)}
                    placeholder={tx('z. B. Trekkingbike, schwarz, 28 Zoll')}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="problem">{tx('Problembeschreibung')}</Label>
                  <Textarea
                    id="problem"
                    value={problembeschreibung}
                    onChange={e => setProblembeschreibung(e.target.value)}
                    placeholder={tx('Was ist kaputt oder soll geprüft werden?')}
                    rows={3}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="abgabe">{tx('Abgabedatum')} *</Label>
                  <Input
                    id="abgabe"
                    type="date"
                    value={abgabedatum}
                    onChange={e => setAbgabedatum(e.target.value)}
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  disabled={!fahrradBeschreibung || !abgabedatum || submitting}
                  onClick={handleSubmitAuftrag}
                  className="w-full sm:w-auto"
                >
                  {submitting ? tx('Wird angelegt …') : tx('Auftrag anlegen')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto"
                >
                  {tx('Zurück')}
                </Button>
              </div>
            </div>
          )
        ) : (
          /* Schritt 2 ohne Kundenauswahl — Fallback für Deep-Link */
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
