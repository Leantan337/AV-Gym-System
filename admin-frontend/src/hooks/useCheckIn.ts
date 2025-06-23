import { useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { CheckInData, CheckOutData } from '../services/websocket';

// Define the CheckIn interface for the hook
export interface CheckIn {
  id: string;
  member: {
    id: string;
    full_name: string;
    membership_type: string;
  };
  check_in_time: string;
  location?: string;
}

export const useCheckIn = () => {
  const { sendMessage, subscribe, isConnected } = useWebSocket();

  const checkInMember = useCallback(async (data: CheckInData) => {
    if (!isConnected) {
      throw new Error('Not connected to WebSocket');
    }
    return sendMessage('check_in', data);
  }, [sendMessage, isConnected]);

  const checkOutMember = useCallback(async (data: CheckOutData) => {
    if (!isConnected) {
      throw new Error('Not connected to WebSocket');
    }
    return sendMessage('check_out', data);
  }, [sendMessage, isConnected]);

  // Fix: Properly type the callback to accept CheckIn data
  const onCheckIn = useCallback((callback: (data: CheckIn) => void) => {
    return subscribe('member_checked_in', (data: unknown) => {
      // Type guard to ensure data matches CheckIn interface
      if (isCheckIn(data)) {
        callback(data);
      } else {
        console.warn('Received invalid check-in data:', data);
      }
    });
  }, [subscribe]);

  const onCheckOut = useCallback((callback: (data: CheckIn) => void) => {
    return subscribe('member_checked_out', (data: unknown) => {
      // Type guard to ensure data matches CheckIn interface
      if (isCheckIn(data)) {
        callback(data);
      } else {
        console.warn('Received invalid check-out data:', data);
      }
    });
  }, [subscribe]);

  return {
    checkInMember,
    checkOutMember,
    onCheckIn,
    onCheckOut,
    isConnected
  };
};

// Type guard function to validate CheckIn data
function isCheckIn(data: unknown): data is CheckIn {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'member' in data &&
    'check_in_time' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).member === 'object' &&
    (data as any).member !== null &&
    'id' in (data as any).member &&
    'full_name' in (data as any).member &&
    'membership_type' in (data as any).member &&
    typeof (data as any).check_in_time === 'string'
  );
}