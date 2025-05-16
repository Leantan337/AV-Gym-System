import { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { CheckInEvent } from '../services/websocket-new';

export const useCheckIn = () => {
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const [checkInStatus, setCheckInStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({ loading: false, error: null, success: false });

  // Handle check-in/check-out
  const handleCheckIn = async (memberId: string) => {
    if (!isConnected) {
      setCheckInStatus({
        loading: false,
        error: 'Not connected to server',
        success: false,
      });
      return;
    }

    setCheckInStatus({ loading: true, error: null, success: false });

    try {
      await sendMessage('check_in', { member_id: memberId });
      setCheckInStatus({ loading: false, error: null, success: true });
      
      // Reset success status after 3 seconds
      setTimeout(() => {
        setCheckInStatus(prev => ({ ...prev, success: false }));
      }, 3000);
    } catch (error) {
      console.error('Check-in error:', error);
      setCheckInStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check in',
        success: false,
      });
    }
  };

  // Subscribe to check-in events
  useEffect(() => {
    const unsubscribe = subscribe<CheckInEvent>('check_in_update', (event) => {
      console.log('New check-in event:', event);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  return {
    handleCheckIn,
    ...checkInStatus,
    isConnected,
  };
};
