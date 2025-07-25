import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import wsService, { ConnectionStatus, CheckInEvent } from '../services/websocket';

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
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInEvent | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialStats, setInitialStats] = useState<CheckInStats | null>(null);

  // Initialize WebSocket connection only once
  useEffect(() => {
    if (isInitialized) return;

    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      // setAuthToken in WebSocket service will handle connection automatically
      wsService.setAuthToken(token);
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

    // Subscribe to check-in events
    const unsubscribeCheckIn = wsService.subscribe<CheckInEvent>(
      'check_in_update',
      (event) => {
        setLatestCheckIn(event);
      }
    );

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeInitialStats();
      unsubscribeCheckIn();
      // Don't disconnect on unmount, let the service handle reconnection
    };
  }, [isInitialized]);

  // Handle auth token changes
  useEffect(() => {
    if (!isInitialized) return;

    const currentToken = wsService.getAuthToken();
    if (currentToken !== authToken) {
      console.log('Auth token changed, updating WebSocket connection');
      // setAuthToken in WebSocket service will handle reconnection automatically
      wsService.setAuthToken(authToken);
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
    // Use WebSocket service's built-in manual reconnect method
    wsService.manualReconnect();
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
