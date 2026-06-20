export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// WebSocket URL - always connect directly to backend (Vercel can't proxy WebSockets)
export const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'https://rendersal.onrender.com';
