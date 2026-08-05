import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import './styles.css';

async function removeLegacyOfflineCache() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys
        .filter(key => key.startsWith('randerscrm-'))
        .map(key => window.caches.delete(key)));
    }
  } catch (error) {
    console.warn('Não foi possível remover o cache legado do Randers CRM:', error);
  }
}

// O CRM depende de dados atuais do Supabase. O modo offline anterior podia servir
// HTML e JavaScript de versões diferentes e prender a tela de inicialização.
void removeLegacyOfflineCache();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
);
