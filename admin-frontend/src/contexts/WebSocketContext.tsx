import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import wsService, { ConnectionStatus, CheckInEvent } from '../services/websocket-new';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  latestCheckIn: CheckInEvent | null;
  sendMessage: <T = any>(event: string, data?: T) => Promise<void>;
  subscribe: <T = any>(
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

  useEffect(() => {
    // Initialize WebSocket connection with auth token if available
    if (authToken) {
      wsService.setAuthToken(authToken);
    }
    wsService.connect();

    // Subscribe to connection status changes
    const unsubscribeStatus = wsService.subscribe<ConnectionStatus>(
      'connection_status',
      (status) => {
        setConnectionStatus(status);
        setIsConnected(status === 'connected');
      },
      true
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
      unsubscribeCheckIn();
      wsService.disconnect();
    };
  }, []);

  const sendMessage = async <T = any,>(event: string, data?: T): Promise<void> => {
    return wsService.send(event, data);
  };

  const subscribe = <T = any>(
    event: string,
    handler: (data: T) => void,
    immediate = true
  ) => {
    return wsService.subscribe(event, handler, immediate);
  };
  
  const reconnect = () => {
    wsService.manualReconnect();
  };
  
  const updateAuthToken = (token: string | null) => {
    setAuthToken(token);
    wsService.setAuthToken(token);
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectionStatus,
        latestCheckIn,
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
