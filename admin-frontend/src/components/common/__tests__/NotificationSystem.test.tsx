import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationSystem from '../NotificationSystem';
import { NotificationProvider, useNotificationContext } from '../../../contexts/NotificationContext';

// Helper component to trigger notifications
const NotificationTester: React.FC = () => {
  const { success, error, warning, info, clearNotifications } = useNotificationContext();
  return (
    <div>
      <button onClick={() => success('Success!', 'Operation was successful')}>Show Success</button>
      <button onClick={() => error('Error!', 'Something went wrong')}>Show Error</button>
      <button onClick={() => warning('Warning!', 'Be careful!')}>Show Warning</button>
      <button onClick={() => info('Info!', 'FYI')}>Show Info</button>
      <button onClick={clearNotifications}>Clear All</button>
    </div>
  );
};

describe('NotificationSystem', () => {
  function setup() {
    return render(
      <NotificationProvider>
        <NotificationTester />
        <NotificationSystem maxNotifications={3} position="top-right" />
      </NotificationProvider>
    );
  }

  it('renders and dismisses success notification', async () => {
    setup();
    fireEvent.click(screen.getByText('Show Success'));
    const title = await screen.findByText(/Success!/);
    const message = await screen.findByText(/Operation was successful/);
    expect(title).toBeInTheDocument();
    expect(message).toBeInTheDocument();
    // Dismiss notification
    const closeButtons = within(document.body).getAllByLabelText('close');
    fireEvent.click(closeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText(/Success!/)).not.toBeInTheDocument();
    });
  });

  it('renders and dismisses error notification', async () => {
    setup();
    fireEvent.click(screen.getByText('Show Error'));
    const title = await screen.findByText(/Error!/);
    const message = await screen.findByText(/Something went wrong/);
    expect(title).toBeInTheDocument();
    expect(message).toBeInTheDocument();
    // Dismiss notification
    const closeButtons = within(document.body).getAllByLabelText('close');
    fireEvent.click(closeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText(/Error!/)).not.toBeInTheDocument();
    });
  });

  it('renders warning and info notifications', async () => {
    setup();
    fireEvent.click(screen.getByText('Show Warning'));
    fireEvent.click(screen.getByText('Show Info'));
    const warningTitle = await screen.findByText(/Warning!/);
    const warningMsg = await screen.findByText(/Be careful!/);
    const infoTitle = await screen.findByText(/Info!/);
    const infoMsg = await screen.findByText(/FYI/);
    expect(warningTitle).toBeInTheDocument();
    expect(warningMsg).toBeInTheDocument();
    expect(infoTitle).toBeInTheDocument();
    expect(infoMsg).toBeInTheDocument();
  });

  it('limits the number of displayed notifications', async () => {
    setup();
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));
    fireEvent.click(screen.getByText('Show Info'));
    await waitFor(() => {
      // Only 3 notifications should be visible (maxNotifications=3)
      const alerts = Array.from(document.body.querySelectorAll('[role="alert"]'));
      expect(alerts.length).toBe(3);
    });
  });

  it('clears all notifications', async () => {
    setup();
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    const title = await screen.findByText(/Success!/);
    const errorTitle = await screen.findByText(/Error!/);
    expect(title).toBeInTheDocument();
    expect(errorTitle).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear All'));
    await waitFor(() => {
      expect(screen.queryByText(/Success!/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Error!/)).not.toBeInTheDocument();
    });
  });

  it('renders notification with action button and handles action', async () => {
    const actionMock = jest.fn();
    const ActionTester: React.FC = () => {
      const { addNotification } = useNotificationContext();
      return (
        <button
          onClick={() =>
            addNotification({
              type: 'info',
              title: 'Action!',
              message: 'Click the action',
              action: {
                label: 'Do It',
                onClick: actionMock
              }
            })
          }
        >
          Show Action
        </button>
      );
    };
    render(
      <NotificationProvider>
        <ActionTester />
        <NotificationSystem />
      </NotificationProvider>
    );
    fireEvent.click(screen.getByText('Show Action'));
    const actionTitle = await screen.findByText(/Action!/);
    expect(actionTitle).toBeInTheDocument();
    const actionButton = within(document.body).getByRole('button', { name: /Do It/i });
    fireEvent.click(actionButton);
    expect(actionMock).toHaveBeenCalled();
  });
}); 