import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import AutoImageSyncManager from '@/components/common/AutoImageSyncManager';
import VersionCheckSafetyNet from '@/components/common/VersionCheckSafetyNet';
import PageSkeleton from '@/components/common/PageSkeleton';
import AIChatAssistant from '@/components/common/AIChatAssistant';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { routes } from './routes';
import { trackPageView } from '@/lib/analytics';
import NotFound from '@/pages/NotFound';

/** Fires a GA4 page_view on every React Router navigation */
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
}

/** Scrolls the window to the top on every route change */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <RouteTracker />
            <ScrollToTop />
            <IntersectObserver />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
                {/* SEO-friendly 404 handler without indiscriminate redirect */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AutoImageSyncManager />
            <VersionCheckSafetyNet />
            <AIChatAssistant />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
