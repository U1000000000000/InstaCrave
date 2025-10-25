/**
 * Main Application Component
 * Root component that sets up routing and global providers
 */

import React from 'react';
import './App.css';
import './styles/theme.css';
import './styles/utilities.css';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
