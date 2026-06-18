import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TripList from './pages/TripList';
import TripOverview from './pages/TripOverview';
import DayDetail from './pages/DayDetail';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBadge from './components/OfflineBadge';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  // BASE_URL is "/" in dev, "/<repo>/" on GH Pages. Strip trailing slash.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <ErrorBoundary>
      <OfflineBadge />
      <ThemeToggle />
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/:slug" element={<TripOverview />} />
          <Route path="/:slug/day/:dayNumber" element={<DayDetail />} />
          <Route path="*" element={<TripList />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
