import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React Hook for WebSocket Real-time Communication with Authentication
 * Provides connection management, event handling, and auto-reconnection
 */
export const useWebSocket = (userId, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000; // 5 seconds - longer delay to prevent rapid reconnections
  const heartbeatInterval = 120000; // 120 seconds - much longer heartbeat to reduce traffic
  const lastMessageRef = useRef(Date.now()); // Track last message time to prevent duplicate processing

  // Get authentication token from the auth system
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('beatspace_token') || sessionStorage.getItem('beatspace_token');
  }, []);

  // Get WebSocket URL from environment with authentication
  const getWebSocketUrl = useCallback(() => {
    if (!userId) return null;
    
    const token = getAuthToken();
    if (!token) {
      console.warn('🚫 WebSocket: No authentication token found');
      return null;
    }
    
    // For development, use local WebSocket server
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    
    // Check if we're in development (localhost) or production
    let wsUrl;
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      // Development: use local WebSocket with /api prefix
      wsUrl = `ws://localhost:8001/api/ws/${userId}?token=${token}`;
    } else {
      // Production: replace protocol with WebSocket and add /api prefix
      const wsBaseUrl = backendUrl.replace(/^https?/, backendUrl.includes('https') ? 'wss' : 'ws');
      wsUrl = `${wsBaseUrl}/api/ws/${userId}?token=${token}`;
    }
    
    return wsUrl;
  }, [userId, getAuthToken]);

  // Connection state guards
  const connectingRef = useRef(false); // Prevent multiple simultaneous connection attempts

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) {
      console.warn('🚫 WebSocket: No user ID provided');
      return;
    }

    // Prevent multiple simultaneous connections
    if (connectingRef.current || (websocketRef.current && websocketRef.current.readyState === WebSocket.CONNECTING)) {
      console.warn('🚫 WebSocket: Connection already in progress');
      return;
    }

    // Close existing connection if it exists
    if (websocketRef.current && websocketRef.current.readyState !== WebSocket.CLOSED) {
      console.log('🔌 WebSocket: Closing existing connection before creating new one');
      websocketRef.current.close();
      websocketRef.current = null;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.warn('🚫 WebSocket: Could not generate WebSocket URL (missing token?)');
      setError('Authentication token required for WebSocket connection');
      return;
    }

    try {
      connectingRef.current = true; // Set connecting flag
      console.log(`🔌 WebSocket: Connecting to ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
      
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log(`✅ WebSocket: Connected as ${userId}`);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        connectingRef.current = false; // Clear connecting flag
        
        // Send initial ping to activate connection (only when connection is open)
        const sendInitialPing = () => {
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        };
        
        // Send ping after a short delay to ensure connection is ready
        setTimeout(sendInitialPing, 1000);
        
        // Start heartbeat to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        }, heartbeatInterval);
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Message deduplication and throttling
          const now = Date.now();
          const messageKey = `${data.type}-${data.offer_id || data.asset_id || 'general'}`;
          
          // Skip if same message type received within last 2 seconds (except for connection status)
          if (data.type !== 'connection_status' && data.type !== 'ping' && data.type !== 'pong') {
            if (now - lastMessageRef.current < 2000) {
              console.log(`⏳ WebSocket: Throttling message ${data.type} - too frequent`);
              return;
            }
            lastMessageRef.current = now;
          }
          
          console.log(`📥 WebSocket: Processing message type: ${data.type}`, data);
          setLastMessage(data);
          
          // Handle authentication success
          if (data.type === 'connection_status' && data.status === 'authenticated') {
            setUserInfo(data.user_info);
            console.log(`🔐 WebSocket: Authenticated as ${data.user_info?.name}`);
          }
          
          // Update connection count if provided
          if (data.active_connections !== undefined) {
            setConnectionCount(data.active_connections);
          }
          
          // Call the message handler if provided and connection is stable
          if (onMessage && typeof onMessage === 'function' && isConnected) {
            onMessage(data);
          }
          
        } catch (err) {
          console.error('🚫 WebSocket: Error parsing message:', err, event.data);
        }
      };

      websocketRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket: Connection closed (${event.code}: ${event.reason})`);
        setIsConnected(false);
        setUserInfo(null);
        
        // Handle authentication errors (4000-4006 range)
        if (event.code >= 4001 && event.code <= 4006) {
          console.error(`🔐 WebSocket: Authentication failed - ${event.reason}`);
          // Don't set user-visible error for auth issues - just log them
          // The UI will simply not show the "Live" status
          return; // Don't attempt to reconnect on auth failures
        }
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`🔄 WebSocket: Attempting to reconnect... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 WebSocket: Max reconnection attempts reached');
          setError('Failed to maintain connection after multiple attempts');
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('🚫 WebSocket: Connection error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

    } catch (err) {
      console.error('🚫 WebSocket: Failed to create connection:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [userId, getWebSocketUrl, onMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    if (websocketRef.current) {
      console.log('🔌 WebSocket: Manually disconnecting...');
      websocketRef.current.close(1000, 'Manual disconnect');
      websocketRef.current = null;
    }
    
    setIsConnected(false);
    setUserInfo(null);
    reconnectAttempts.current = 0;
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        websocketRef.current.send(messageStr);
        console.log('📤 WebSocket: Sent message:', message);
        return true;
      } catch (err) {
        console.error('🚫 WebSocket: Failed to send message:', err);
        return false;
      }
    } else {
      console.warn('🚫 WebSocket: Cannot send message - connection not ready. State:', 
                  websocketRef.current ? websocketRef.current.readyState : 'No connection');
      return false;
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    if (userId) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Handle page visibility changes (reconnect when tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isConnected && userId) {
        console.log('👁️ WebSocket: Tab became active, attempting to reconnect...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, userId, connect]);

  return {
    isConnected,
    connectionCount,
    lastMessage,
    error,
    userInfo,
    sendMessage,
    connect,
    disconnect
  };
};

/**
 * Event types for real-time updates
 */
export const WEBSOCKET_EVENTS = {
  CONNECTION_STATUS: 'connection_status',
  OFFER_QUOTED: 'offer_quoted',
  OFFER_APPROVED: 'offer_approved',
  OFFER_REJECTED: 'offer_rejected',
  REVISION_REQUESTED: 'revision_requested',
  ASSET_STATUS_CHANGED: 'asset_status_changed',
  NEW_OFFER_REQUEST: 'new_offer_request'
};

/**
 * Helper function to get user ID for WebSocket connection
 */
export const getWebSocketUserId = (user) => {
  if (!user) return null;
  
  // For admin users
  if (user.role === 'admin' || user.email?.includes('admin')) {
    return 'admin';
  }
  
  // For other users, use their email
  return user.email || user.id;
};