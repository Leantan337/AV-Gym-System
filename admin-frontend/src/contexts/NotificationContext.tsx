import React, { createContext, useContext, ReactNode } from 'react';
import { useNotification, UseNotificationReturn } from '../hooks/useNotification';

// Create the notification context
const NotificationContext = createContext<UseNotificationReturn | undefined>(undefined);

// Custom hook to use the notification context
export const useNotificationContext = (): UseNotificationReturn => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationHook = useNotification();

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
    </NotificationContext.Provider>
  );
}; 