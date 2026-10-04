import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import * as api from './lib/api.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';

function Protected({ children }) {
  const loc = useLocation();
  if (!api.getToken()) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  if (api.getToken()) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const [, force] = useState(0);
  useEffect(() => {
    const onLogout = () => force((n) => n + 1);
    window.addEventListener('user:logout', onLogout);
    return () => window.removeEventListener('user:logout', onLogout);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={api.getToken() ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/dashboard/*" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile" element={<Protected><Dashboard /></Protected>} />
      <Route path="/devices" element={<Protected><Dashboard /></Protected>} />
      <Route path="/activity" element={<Protected><Dashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
