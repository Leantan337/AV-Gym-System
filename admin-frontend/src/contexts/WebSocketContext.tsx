import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import wsService, { ConnectionStatus, CheckInEvent, WebSocketError } from '../services/websocket';

interface CheckInStats {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  latestCheckIn: CheckInEvent | null;
  initialStats: CheckInStats | null;
  sendMessage: <T = unknown>(event: string, data?: T) => Promise<void>;
  subscribe: <T = unknown>(
    event: string, 
    handler: (data: T) => void,
    immediate?: boolean
  ) => () => void;
  reconnect: () => void;
  setAuthToken: (token: string | null) => void;
  lastError: WebSocketError | null;
  isFallbackMode: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInEvent | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialStats, setInitialStats] = useState<CheckInStats | null>(null);
  const [lastError, setLastError] = useState<WebSocketError | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Initialize WebSocket connection only once
  useEffect(() => {
    if (isInitialized) return;

    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      wsService.setAuthToken(token);
      wsService.connect(false, false);
    }
    setIsInitialized(true);

    // Subscribe to connection status changes
    const unsubscribeStatus = wsService.subscribe<ConnectionStatus>(
      'connection_status',
      (status) => {
        console.log('WebSocket status in context changed to:', status);
        setConnectionStatus(status);
        setIsConnected(status === 'connected');
      }
    );

    // Subscribe to initial stats message
    const unsubscribeInitialStats = wsService.subscribe<CheckInStats>(
      'initial_stats',
      (stats) => {
        console.log('Received initial stats:', stats);
        setInitialStats(stats);
      }
    );

    // Subscribe to check-in events - we'll use member_checked_in for latest check-in tracking
    const unsubscribeCheckIn = wsService.subscribe<CheckInEvent>(
      'member_checked_in',
      (event) => {
        setLatestCheckIn(event);
      }
    );

    // Subscribe to WebSocket errors
    const unsubscribeError = wsService.subscribe<WebSocketError>(
      'websocket_error',
      (error) => {
        console.log('WebSocket error received:', error);
        setLastError(error);
      }
    );

    // Subscribe to fallback mode notifications
    const unsubscribeFallback = wsService.subscribe<{ mode: string; interval: number }>(
      'fallback_polling',
      (data) => {
        console.log('WebSocket fallback mode activated:', data);
        setIsFallbackMode(true);
      }
    );

    // Check fallback mode status periodically
    const fallbackCheckInterval = setInterval(() => {
      setIsFallbackMode(wsService.isFallbackMode());
    }, 5000);

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeInitialStats();
      unsubscribeCheckIn();
      unsubscribeError();
      unsubscribeFallback();
      clearInterval(fallbackCheckInterval);
      // Don't disconnect on unmount, let the service handle reconnection
    };
  }, [isInitialized]);

  // Handle auth token changes
  useEffect(() => {
    if (!isInitialized) return;

    const currentToken = wsService.getAuthToken();
    if (currentToken !== authToken) {
      console.log('Auth token changed, updating WebSocket connection');
      wsService.setAuthToken(authToken);
      // Always reconnect when token changes (including when token is removed)
      wsService.connect(false, false);
    }
  }, [authToken, isInitialized]);

  const sendMessage = async <T = unknown,>(event: string, data?: T): Promise<void> => {
    return wsService.send(event, data);
  };

  const subscribe = <T = unknown>(
    event: string,
    handler: (data: T) => void,
    // immediate = true // Remove this parameter since wsService.subscribe does not support it
  ) => {
    return wsService.subscribe(event, handler);
  };
  
  const reconnect = () => {
    wsService.connect(true, false);
  };
  
  const updateAuthToken = (token: string | null) => {
    setAuthToken(token);
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectionStatus,
        latestCheckIn,
        initialStats,
        sendMessage,
        subscribe,
        reconnect,
        setAuthToken: updateAuthToken,
        lastError,
        isFallbackMode,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
