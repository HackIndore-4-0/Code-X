import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Events from './pages/Events';
import Simulation from './pages/Simulation';
import Audit from './pages/Audit';
import LandingScreen from './components/LandingScreen';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function MainRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already on a specific route (or previously entered in this session), skip landing
  const [hasEntered, setHasEntered] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('tracex_entered');
      if (stored === 'true') return true;
      if (window.location.pathname !== '/') return true;
    }
    return false;
  });

  const handleEnterDashboard = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tracex_entered', 'true');
    }
    setHasEntered(true);
    if (location.pathname === '/') {
      navigate('/');
    }
  };

  useEffect(() => {
    if (location.pathname !== '/' && !hasEntered) {
      setHasEntered(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tracex_entered', 'true');
      }
    }
  }, [location.pathname, hasEntered]);

  if (!hasEntered && location.pathname === '/') {
    return <LandingScreen onEnter={handleEnterDashboard} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="events" element={<Events />} />
          <Route path="simulation" element={<Simulation />} />
          <Route path="audit" element={<Audit />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
