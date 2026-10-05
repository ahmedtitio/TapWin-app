import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getToken, clearSession } from './lib/api';
import { initGA, trackPage } from './lib/analytics';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import { I18nProvider } from './lib/i18n';

function Protected({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

/** Sends a GA4 pageview on every client-side route change. */
function GaPageViews() {
  const location = useLocation();
  useEffect(() => {
    trackPage(location.pathname + location.search);
  }, [location]);
  return null;
}

export default function App() {
  useEffect(() => {
    initGA();
    const onLogout = () => {}; // api.js already cleared storage; router guard handles redirect
    window.addEventListener('admin:logout', onLogout);
    return () => window.removeEventListener('admin:logout', onLogout);
  }, []);

  return (
    <I18nProvider>
    <ToastProvider>
      <BrowserRouter>
        <GaPageViews />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
    </I18nProvider>
  );
}
