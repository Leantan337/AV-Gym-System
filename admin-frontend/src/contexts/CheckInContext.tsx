import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useWebSocket } from './WebSocketContext';
import { CheckInEvent } from '../services/websocket-new';

interface CheckInContextType {
  checkIn: (memberId: string) => Promise<void>;
  checkOut: (checkInId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
  latestCheckIn: CheckInEvent | null;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sendMessage, latestCheckIn } = useWebSocket();
  const [status, setStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({ loading: false, error: null, success: false });

  const checkIn = useCallback(async (memberId: string) => {
    setStatus({ loading: true, error: null, success: false });
    try {
      await sendMessage('check_in', { member_id: memberId });
      setStatus({ loading: false, error: null, success: true });
    } catch (error) {
      console.error('Check-in error:', error);
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check in',
        success: false,
      });
    }
  }, [sendMessage]);

  const checkOut = useCallback(async (checkInId: string) => {
    setStatus({ loading: true, error: null, success: false });
    try {
      await sendMessage('check_out', { check_in_id: checkInId });
      setStatus({ loading: false, error: null, success: true });
    } catch (error) {
      console.error('Check-out error:', error);
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check out',
        success: false,
      });
    }
  }, [sendMessage]);

  return (
    <CheckInContext.Provider
      value={{
        checkIn,
        checkOut,
        loading: status.loading,
        error: status.error,
        success: status.success,
        latestCheckIn,
      }}
    >
      {children}
    </CheckInContext.Provider>
  );
};

export const useCheckIn = (): CheckInContextType => {
  const context = useContext(CheckInContext);
  if (context === undefined) {
    throw new Error('useCheckIn must be used within a CheckInProvider');
  }
  return context;
};
