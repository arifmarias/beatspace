import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Enhanced WebSocket Hook for BeatSpace
 * Provides real-time communication with notification support
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
  const maxReconnectAttempts = 10; // Increased from 3 to 10
  const reconnectDelay = 3000; // Reduced initial delay to 3 seconds  
  const heartbeatInterval = 180000; // 3 minutes heartbeat
  const lastMessageRef = useRef(Date.now()); // Track last message time to prevent duplicate processing

  // Get authentication token from the auth system
  const getAuthToken = useCallback(() => {
    const localToken = localStorage.getItem('beatspace_token');
    const sessionToken = sessionStorage.getItem('beatspace_token');
    const token = localToken || sessionToken;
    
    console.log(`🔐 WebSocket: Token debugging:`);
    console.log(`   localStorage token: ${localToken ? localToken.substring(0, 20) + '...' : 'null'}`);
    console.log(`   sessionStorage token: ${sessionToken ? sessionToken.substring(0, 20) + '...' : 'null'}`);
    console.log(`   Selected token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
    console.log(`   Token length: ${token ? token.length : 0}`);
    
    if (token) {
      // Validate JWT structure (should have 3 parts separated by dots)
      const parts = token.split('.');
      console.log(`   JWT parts count: ${parts.length} (should be 3)`);
      if (parts.length !== 3) {
        console.error(`❌ Invalid JWT structure: Expected 3 parts, got ${parts.length}`);
      }
    }
    
    return token;
  }, []);

  // Get WebSocket URL from environment with authentication
  const getWebSocketUrl = useCallback(() => {
    if (!userId) return null;
    
    const token = getAuthToken();
    if (!token) {
      console.warn('🚫 WebSocket: No authentication token found');
      return null;
    }
    
    // Always use localhost for development when frontend is served from localhost
    const currentUrl = window.location.href;
    const isLocalDevelopment = currentUrl.includes('localhost:3000') || currentUrl.includes('127.0.0.1:3000');
    
    console.log('🔍 WebSocket URL Detection:');
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   isLocalDevelopment: ${isLocalDevelopment}`);
    
    let wsUrl;
    if (isLocalDevelopment || process.env.NODE_ENV === 'development') {
      // Development: use local WebSocket with authentication
      wsUrl = `ws://localhost:8001/api/ws/${userId}?token=${token}`;
      console.log('🏠 WebSocket: Using local development URL (localhost:8001)');
    } else {
      // Production: use environment URL
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const wsBaseUrl = backendUrl.replace(/^https?/, backendUrl.includes('https') ? 'wss' : 'ws');
      wsUrl = `${wsBaseUrl}/api/ws/${userId}?token=${token}`;
      console.log('🌐 WebSocket: Using production URL');
    }
    
    return wsUrl;
  }, [userId, getAuthToken]);

  // Connection state guards
  const connectingRef = useRef(false); // Prevent multiple simultaneous connection attempts
  const lastConnectionAttemptRef = useRef(0); // Track last connection attempt time
  const connectionCooldown = 2000; // Reduced cooldown to 2 seconds

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) {
      console.warn('🚫 WebSocket: No user ID provided');
      return;
    }

    // Rate limiting: prevent connections too frequently
    const now = Date.now();
    if (now - lastConnectionAttemptRef.current < connectionCooldown) {
      console.warn('🚫 WebSocket: Connection attempt rate limited - waiting for cooldown');
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

    // Record connection attempt time
    lastConnectionAttemptRef.current = now;

    try {
      connectingRef.current = true; // Set connecting flag
      console.log(`🔌 WebSocket: Attempting connection to: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.CONNECTING) {
          console.error('❌ WebSocket: Connection timeout after 10 seconds');
          websocketRef.current.close();
          setError('Connection timeout');
          connectingRef.current = false;
        }
      }, 10000); // 10 second timeout
      
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✅ WebSocket: Successfully connected as ${userId}`);
        console.log(`🔌 WebSocket: Connection ready state: ${websocketRef.current.readyState}`);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        connectingRef.current = false; // Clear connecting flag
        
        // Send initial ping to activate connection (only when connection is open)
        const sendInitialPing = () => {
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            console.log('📤 WebSocket: Sending initial ping');
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
            console.log('💓 WebSocket: Sending heartbeat ping');
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
          
          console.log(`📥 WebSocket: RECEIVED MESSAGE - Type: ${data.type}`, data);
          
          // Skip if same message type received within last 2 seconds (except for connection status)
          if (data.type !== 'connection_status' && data.type !== 'ping' && data.type !== 'pong') {
            if (now - lastMessageRef.current < 2000) {
              console.log(`⏳ WebSocket: Throttling message ${data.type} - too frequent`);
              return;
            }
            lastMessageRef.current = now;
          }
          
          console.log(`✅ WebSocket: Processing message type: ${data.type}`, data);
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
          if (onMessage && typeof onMessage === 'function') {
            console.log(`🎯 WebSocket: Calling message handler for ${data.type}`);
            onMessage(data);
          } else {
            console.warn(`⚠️ WebSocket: No message handler provided for ${data.type}`);
          }
          
        } catch (err) {
          console.error('🚫 WebSocket: Error parsing message:', err, event.data);
        }
      };

      websocketRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket: Connection closed (${event.code}: ${event.reason})`);
        setIsConnected(false);
        setUserInfo(null);
        connectingRef.current = false; // Clear connecting flag on close
        
        // Handle authentication errors (4000-4006 range)
        if (event.code >= 4001 && event.code <= 4006) {
          console.error(`🔐 WebSocket: Authentication failed - ${event.reason}`);
          // Don't set user-visible error for auth issues - just log them
          // The UI will simply not show the "Live" status
          return; // Don't attempt to reconnect on auth failures
        }
        
        // Attempt to reconnect if not a clean close (more conservative approach)
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          // Use exponential backoff for reconnection delay
          const backoffDelay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts.current), 30000); // Max 30 seconds
          
          console.log(`🔄 WebSocket: Attempting to reconnect in ${backoffDelay/1000}s... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectAttempts.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 WebSocket: Max reconnection attempts reached');
          setError('Failed to maintain connection after multiple attempts');
        } else {
          console.log('🔌 WebSocket: Clean close - not attempting to reconnect');
        }
      };

      websocketRef.current.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('🚫 WebSocket: Connection error occurred:', error);
        console.error('🚫 WebSocket: Error event details:', {
          type: error.type,
          target: error.target,
          readyState: error.target?.readyState
        });
        console.error('🚫 WebSocket: Attempted URL:', wsUrl.replace(/token=[^&]+/, 'token=***'));
        setError(`WebSocket connection error: ${error.type || 'Unknown error'}`);
        setIsConnected(false);
        connectingRef.current = false; // Clear connecting flag on error
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

  // Initialize connection on mount with better stability
  useEffect(() => {
    if (userId) {
      console.log(`🔌 WebSocket: Initializing connection for user: ${userId}`);
      console.log(`🔌 WebSocket: Current isConnected state: ${isConnected}`);
      connect();
    } else {
      console.warn('🚫 WebSocket: No userId provided for connection');
    }

    // Cleanup on unmount - but NOT on userId changes
    return () => {
      if (websocketRef.current) {
        console.log('🔌 WebSocket: Component unmounting - cleaning up connection');
        disconnect();
      }
    };
  }, [userId]); // Only depend on userId, not connect/disconnect functions

  // Separate effect to handle reconnection attempts
  useEffect(() => {
    console.log(`🔄 WebSocket: Connection state changed - isConnected: ${isConnected}, userId: ${userId}`);
    if (!isConnected && userId && reconnectAttempts.current < maxReconnectAttempts) {
      console.log('🔄 WebSocket: Connection lost, attempting to reconnect...');
      const timer = setTimeout(() => {
        connect();
      }, reconnectDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, userId]); // Reconnect when connection is lost

  // Log connection state changes
  useEffect(() => {
    console.log(`📊 WebSocket Status Update: Connected=${isConnected}, User=${userId}, Error=${error}, ConnectionCount=${connectionCount}`);
    if (userInfo) {
      console.log(`👤 WebSocket User Info:`, userInfo);
    }
  }, [isConnected, error, userId, connectionCount, userInfo]);

  // Handle page visibility changes (reconnect when tab becomes active) - DISABLED to prevent connection loops
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && !isConnected && userId) {
  //       console.log('👁️ WebSocket: Tab became active, attempting to reconnect...');
  //       connect();
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [isConnected, userId, connect]);

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