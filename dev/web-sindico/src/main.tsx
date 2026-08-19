import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeDevMode } from '@/mocks';
import App from '@/app/App';
import '@/index.css';

initializeDevMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
