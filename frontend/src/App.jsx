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
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';


function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster 
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '8px',
                  fontWeight: '500',
                },
              }}
            />
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
