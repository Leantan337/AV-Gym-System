import { useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { CheckInData, CheckOutData } from '../services/websocket';

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

  const onCheckIn = useCallback((callback: (data: any) => void) => {
    return subscribe('member_checked_in', callback);
  }, [subscribe]);

  const onCheckOut = useCallback((callback: (data: any) => void) => {
    return subscribe('member_checked_out', callback);
  }, [subscribe]);

  return {
    checkInMember,
    checkOutMember,
    onCheckIn,
    onCheckOut,
    isConnected
  };
};
