import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Ignore benign Vite/HMR errors that occur because HMR is disabled in this environment
  if (event.reason === 'WebSocket closed without opened.' || 
      (event.reason?.message && event.reason.message.includes('WebSocket'))) {
    return;
  }
  
  console.error('Unhandled Promise Rejection:', event.reason);
  // Prevent the error from crashing the UI if it's non-critical
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
