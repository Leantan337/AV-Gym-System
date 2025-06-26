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

// Helper type guards for better type safety
function hasProperty<T extends Record<string, unknown>>(
  obj: T,
  prop: string
): obj is T & Record<string, unknown> {
  return prop in obj;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
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
  if (!isObject(data)) {
    return false;
  }

  // Check if data has required top-level properties
  if (!hasProperty(data, 'id') || !hasProperty(data, 'member') || !hasProperty(data, 'check_in_time')) {
    return false;
  }

  // Validate id property
  if (!isString(data.id)) {
    return false;
  }

  // Validate member property
  if (!isObject(data.member)) {
    return false;
  }

  const member = data.member;
  if (!hasProperty(member, 'id') || !hasProperty(member, 'full_name') || !hasProperty(member, 'membership_type')) {
    return false;
  }

  if (!isString(member.id) || !isString(member.full_name) || !isString(member.membership_type)) {
    return false;
  }

  // Validate check_in_time property
  if (!isString(data.check_in_time)) {
    return false;
  }

  // Optional location property validation
  if (hasProperty(data, 'location') && data.location !== undefined && !isString(data.location)) {
    return false;
  }

  return true;
}