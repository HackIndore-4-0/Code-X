import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Events from './pages/Events';
import Simulation from './pages/Simulation';
import Audit from './pages/Audit';
import LandingScreen from './components/LandingScreen';

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
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  const handleEnterDashboard = () => {
    setHasEntered(true);
    navigate('/');
  };

  if (!hasEntered) {
    return <LandingScreen onEnter={handleEnterDashboard} />;
  }

  return (
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
