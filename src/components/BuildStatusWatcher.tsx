import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { t } from '@/i18n';

const APPGROUP_ID = '6a89382e75a653c5efccd3f5';
const AGENT_STATE_ENDPOINT = `/claude/build/agent-state/${APPGROUP_ID}`;

// Aktiv (Build läuft): eng pollen, damit Pill/Prozent leben. Passiv: selten —
// der Endpoint ist billig, aber ein stilles Dashboard braucht keine Frequenz.
const ACTIVE_POLL_MS = 5000;
const IDLE_POLL_MS = 45000;
const ERROR_POLL_MS = 60000;

interface AgentState {
  build_status?: string | null;
  build_pct?: number | null;
}

interface DeployedVersion {
  codebase?: string;
  metadata_fingerprint?: string;
}

async function fetchDeployed(): Promise<DeployedVersion | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * BuildStatusWatcher — macht laufende Builds sichtbar, ohne je zu blockieren.
 *
 * Während eines Struktur-Saves/Updates läuft das alte Dashboard sicher weiter
 * (Daten liegen auf der Plattform, der Deploy tauscht atomar). Das echte
 * UX-Problem ist die Erwartungslücke: „Ich habe gespeichert — wo ist meine
 * Änderung?" Antwort in zwei Teilen:
 *
 *  1. Ruhige Status-Pill (unten links, außerhalb der Sonner-Ecke) solange
 *     agent-state build_status === 'building' meldet — pulsierender Punkt
 *     statt Blinken (WCAG; Blinken kommuniziert Alarm, gemeint ist Geduld).
 *  2. Nach dem Deploy (version.json-codebase weicht vom Stand beim Laden ab):
 *     persistenter Toast mit „Neu laden". Auto-Reload NUR wenn der Tab
 *     unsichtbar ist und kein Dialog offen — niemandem wird die Seite unterm
 *     Formular weggezogen. Hat sich der metadata_fingerprint geändert, warnt
 *     der Toast zusätzlich vor veralteten offenen Formularen (ein Save auf
 *     ein plattformseitig gelöschtes Feld würde einen API-Fehler zeigen).
 *
 * Fail-silent: jeder Fetch-Fehler blendet die Pill aus und pollt langsamer —
 * dieses Feature darf nie selbst zur Störung werden.
 */
export function BuildStatusWatcher() {
  // null = kein Build aktiv (Pill unsichtbar)
  const [pct, setPct] = useState<number | null>(null);
  const baseline = useRef<DeployedVersion | null>(null);
  const baselineLoaded = useRef(false);
  const notified = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    let timer: number | undefined;

    function notifyFresh(structureChanged: boolean) {
      const dialogOpen = !!document.querySelector('[role="dialog"]');
      if (document.hidden && !dialogOpen) {
        // Tab im Hintergrund, nichts Ungespeichertes sichtbar → still
        // aktualisieren; der Nutzer kommt auf die frische Version zurück.
        window.location.reload();
        return;
      }
      toast(t('vc_updated_toast'), {
        description: structureChanged ? t('vc_updated_toast_desc') : undefined,
        duration: Infinity,
        action: { label: t('vc_updated_reload'), onClick: () => window.location.reload() },
      });
    }

    async function tick() {
      if (cancelled || running) return;
      running = true;
      let next = IDLE_POLL_MS;
      try {
        if (!baselineLoaded.current) {
          baseline.current = await fetchDeployed();
          baselineLoaded.current = true;
        }
        const res = await fetch(AGENT_STATE_ENDPOINT, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const state: AgentState = await res.json();
        if (state.build_status === 'building') {
          setPct(typeof state.build_pct === 'number' ? state.build_pct : 0);
          next = ACTIVE_POLL_MS;
        } else {
          setPct(null);
          if (!notified.current && baseline.current?.codebase) {
            const now = await fetchDeployed();
            if (now?.codebase && now.codebase !== baseline.current.codebase) {
              notified.current = true;
              // Struktur-Hinweis nur bei ECHTEM Fingerprint-Wechsel: Alt-
              // Dashboards (legacy-backfill) tragen noch keinen Fingerprint —
              // undefined !== "…" wäre beim ersten Deploy nach der Umstellung
              // eine falsche Warnung.
              notifyFresh(
                !!baseline.current.metadata_fingerprint &&
                !!now.metadata_fingerprint &&
                now.metadata_fingerprint !== baseline.current.metadata_fingerprint,
              );
            }
          }
        }
      } catch {
        setPct(null);
        next = ERROR_POLL_MS;
      }
      running = false;
      if (!cancelled) timer = window.setTimeout(tick, next);
    }

    tick();
    // Beim Zurückkehren in den Tab sofort prüfen statt aufs Intervall zu warten.
    const onVisibility = () => {
      if (!document.hidden && !running) {
        window.clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (pct === null) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-lg pointer-events-none select-none">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span>{t('vc_build_pill')}</span>
      <span className="tabular-nums text-muted-foreground/70">{pct}%</span>
    </div>
  );
}
