import '@/lib/sentry';
import '@/lib/stale-bundle';
import { Fragment, lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { locale, onLocaleChange, syncProfileLocale } from '@/i18n';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import LeihraederPage from '@/pages/LeihraederPage';
import LeihraederDetailPage from '@/pages/LeihraederDetailPage';
import KundenPage from '@/pages/KundenPage';
import KundenDetailPage from '@/pages/KundenDetailPage';
import ReparaturauftraegePage from '@/pages/ReparaturauftraegePage';
import ReparaturauftraegeDetailPage from '@/pages/ReparaturauftraegeDetailPage';
import ErsatzteilePage from '@/pages/ErsatzteilePage';
import ErsatzteileDetailPage from '@/pages/ErsatzteileDetailPage';
// <custom:imports>
const IntentAuftragAnlegenPage = lazy(() => import('@/pages/intents/AuftragAnlegenPage'));
const IntentAuftragAbschliessenPage = lazy(() => import('@/pages/intents/AuftragAbschliessenPage'));

const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

function LocaleGate({ children }: { children: React.ReactNode }) {
  const [gen, setGen] = useState(0);
  useEffect(() => onLocaleChange(() => setGen((g) => g + 1)), []);
  useEffect(() => {
    if (!window.location.hash.startsWith('#/public')) void syncProfileLocale();
  }, []);
  return <Fragment key={`${locale}:${gen}`}>{children}</Fragment>;
}
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <LocaleGate>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="leihraeder" element={<LeihraederPage />} />
                <Route path="leihraeder/:id" element={<LeihraederDetailPage />} />
                <Route path="kunden" element={<KundenPage />} />
                <Route path="kunden/:id" element={<KundenDetailPage />} />
                <Route path="reparaturauftraege" element={<ReparaturauftraegePage />} />
                <Route path="reparaturauftraege/:id" element={<ReparaturauftraegeDetailPage />} />
                <Route path="ersatzteile" element={<ErsatzteilePage />} />
                <Route path="ersatzteile/:id" element={<ErsatzteileDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                <Route path="intents/auftrag-anlegen" element={<Suspense fallback={null}><IntentAuftragAnlegenPage /></Suspense>} />
                <Route path="intents/auftrag-abschliessen" element={<Suspense fallback={null}><IntentAuftragAbschliessenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
            </LocaleGate>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
