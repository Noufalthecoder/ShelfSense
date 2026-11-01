import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// the scanner app lives at /app; everything else is the landing page
const ShelfApp = lazy(() => import('./app/ShelfApp.jsx'));
const isApp = location.pathname.startsWith('/app');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isApp ? <Suspense fallback={null}><ShelfApp /></Suspense> : <App />}
  </StrictMode>,
);
