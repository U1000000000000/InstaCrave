/**
 * Application Entry Point
 * Initializes React app with theme support
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyTheme } from './utils/helpers';
import { STORAGE_KEYS, THEMES } from './constants';

const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEMES.SYSTEM;
applyTheme(storedTheme);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has a div with id="root"');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
