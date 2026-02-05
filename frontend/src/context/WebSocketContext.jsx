/**
 * WebSocket Context - Real-Time Communication for Frontend
 * 
 * Features:
 * - Auto-connection with JWT authentication
 * - Reconnection logic with exponential backoff
 * - Event listeners for order:created and order:statusUpdated
 * - Connection status monitoring
 * - Health check with ping/pong
 * 
 * Usage:
 * - Wrap app with <WebSocketProvider>
 * - Use useWebSocket() hook in components to access socket and events
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WEBSOCKET_URL } from '../config';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'reconnecting', 'error'
  const [lastPing, setLastPing] = useState(null);
  
  const socketRef = useRef(null); // Store socket in ref to avoid stale closures
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectTimer = useRef(null);
  const pingInterval = useRef(null);

  // Event listeners registry
  const eventListeners = useRef(new Map());

  /**
   * Register an event listener
   * 
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   * @returns {function} Cleanup function to remove listener
   */
  const on = useCallback((event, handler) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set());
    }
    eventListeners.current.get(event).add(handler);

    // Return cleanup function
    return () => {
      const handlers = eventListeners.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventListeners.current.delete(event);
        }
      }
    };
  }, []);

  /**
   * Emit event to all registered listeners
   * 
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  const emitToListeners = useCallback((event, data) => {
    const handlers = eventListeners.current.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }, []);

  /**
   * Connect to WebSocket server with authentication via cookies
   */
  const connect = useCallback(() => {
    setConnectionStatus('connecting');

    try {
      // Create Socket.IO client with cookie-based authentication
      // WebSocket must connect directly to backend (Vercel can't proxy WebSockets)
      const newSocket = io(WEBSOCKET_URL, {
        withCredentials: true, // Send cookies automatically
        transports: ['websocket', 'polling'], // WebSocket preferred, polling fallback
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000,
      });

      // Connection successful
      newSocket.on('connect', () => {
        console.log('WebSocket connected', { socketId: newSocket.id });
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;

        // Start heartbeat ping
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }
        pingInterval.current = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('ping');
          }
        }, 30000); // Ping every 30 seconds
      });

      // Connection confirmation from server
      newSocket.on('connected', (data) => {
        console.log('WebSocket connection confirmed', data);
      });

      // Handle pong response for health monitoring
      newSocket.on('pong', (data) => {
        setLastPing(data.timestamp);
      });

      // Order created event (for food partners)
      newSocket.on('order:created', (data) => {
        console.log('New order received', data);
        emitToListeners('order:created', data);
      });

      // Order status updated event (for users)
      newSocket.on('order:statusUpdated', (data) => {
        console.log('Order status updated', data);
        emitToListeners('order:statusUpdated', data);
      });

      // Connection error
      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error', error.message);
        setIsConnected(false);
        setConnectionStatus('error');
        
        // Attempt reconnection
        handleReconnect();
      });

      // Disconnection
      newSocket.on('disconnect', (reason) => {
        console.warn('WebSocket disconnected', { reason });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        // Attempt reconnection if not a manual disconnect
        if (reason !== 'io client disconnect') {
          handleReconnect();
        }
      });

      setSocket(newSocket);
      socketRef.current = newSocket; // Keep ref in sync
    } catch (error) {
      console.error('Failed to create WebSocket connection', error);
      setConnectionStatus('error');
      handleReconnect();
    }
  }, [emitToListeners]);

  /**
   * Handle reconnection with exponential backoff
   */
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, etc.
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 32000);
    reconnectAttempts.current += 1;

    console.log(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
    setConnectionStatus('reconnecting');

    reconnectTimer.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, delay);
  }, [connect]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    const currentSocket = socketRef.current;
    if (currentSocket) {
      currentSocket.disconnect();
      setSocket(null);
      socketRef.current = null;
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }

    reconnectAttempts.current = 0;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Reconnect when user logs in/out (listen for custom event)
  useEffect(() => {
    const handleAuthChange = () => {
      // Disconnect current socket if exists
      disconnect();
      // Reconnect with new auth state
      setTimeout(() => connect(), 100);
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up listener once on mount

  const value = {
    socket,
    isConnected,
    connectionStatus,
    lastPing,
    on,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access WebSocket context
 * 
 * @returns {Object} WebSocket context
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
