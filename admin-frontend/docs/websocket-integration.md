# WebSocket Integration Documentation

This document provides comprehensive information about the WebSocket implementation in the AV-Gym-System, including event types, message structures, authentication, and guidelines for extending the system.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Event Types](#event-types)
5. [Message Structures](#message-structures)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Integration Guidelines](#integration-guidelines)
9. [Testing](#testing)

## Overview

The WebSocket integration provides real-time updates throughout the application, with a primary focus on the Check-In Module. It enables features such as:

- Real-time check-in/check-out notifications
- Live dashboard statistics updates
- Connection status monitoring
- Secure authenticated connections
- Automatic reconnection with backoff

## Architecture

The WebSocket system follows a provider pattern and consists of the following key components:

1. **WebSocketService**: Core service that manages the WebSocket connection, handles messages, and provides methods for sending/receiving data.
2. **WebSocketProvider**: React context provider that makes WebSocket functionality available throughout the application.
3. **CheckInProvider**: Specialized provider for check-in functionality that uses WebSocketProvider.
4. **ConnectionStatusIndicator**: UI component for displaying connection status.
5. **WebSocketErrorBoundary**: Error boundary component for handling WebSocket-related errors.

## Authentication

WebSocket connections are authenticated using JWT tokens:

1. The `AuthenticatedWebSocket` component syncs the authentication state with WebSocket connections.
2. When a user logs in, the JWT token is passed to the WebSocket connection.
3. The token is appended to the WebSocket URL as a query parameter.
4. The server validates the token and sends an `auth_response` message.
5. If authentication fails, the connection is closed and the user is notified.

## Event Types

| Event Type | Direction | Description |
|------------|-----------|-------------|
| `connection_status` | Server → Client | Indicates the current connection status |
| `auth_response` | Server → Client | Authentication response (success/failure) |
| `check_in` | Client → Server | Request to check in a member |
| `check_out` | Client → Server | Request to check out a member |
| `check_in_update` | Server → Client | Notification of a check-in/check-out event |
| `member_update` | Server → Client | Notification of a member profile update |
| `notification` | Server → Client | General notification message |
| `ping` | Client → Server | Connection health check |
| `pong` | Server → Client | Response to ping message |
| `batch` | Server → Client | Batch of multiple messages (for optimization) |

## Message Structures

### General Message Format

```typescript
interface WebSocketMessage<T = any> {
  type: string;  // Event type from the list above
  payload: T;    // Event-specific data structure
}
```

### Check-In Event

```typescript
interface CheckInEvent {
  id: string;
  member: {
    id: string;
    full_name: string;
  };
  check_in_time: string;
  check_out_time: string | null;
  status: 'checked_in' | 'checked_out';
}
```

### Authentication Response

```typescript
interface AuthResponse {
  success: boolean;
  message?: string;  // Error message if authentication fails
}
```

### Batch Message

```typescript
interface BatchMessage {
  batches: {
    [eventType: string]: any[];  // Array of payloads for each event type
  }
}
```

## Performance Optimization

### Message Batching

High-volume messages are automatically batched to reduce network overhead:

1. Messages are collected over a short interval (100ms by default).
2. Messages of the same type are grouped together.
3. A single batch message is sent containing all collected messages.
4. The receiving end distributes messages to the appropriate handlers.

### Connection Management

1. **Automatic Reconnection**: The system automatically attempts to reconnect with an exponential backoff strategy.
2. **Ping/Pong**: Regular ping messages are sent to keep the connection alive and detect disconnections.
3. **Message Queueing**: Critical messages are queued when the connection is lost and sent when reconnected.

## Error Handling

### Error Types

1. **Connection Errors**: Handled by automatic reconnection with user feedback.
2. **Authentication Errors**: Displayed to the user with option to re-authenticate.
3. **Message Processing Errors**: Logged and isolated to prevent application crashes.

### Error Boundaries

React Error Boundaries are used to isolate WebSocket-related errors and prevent them from crashing the entire application:

```jsx
<WebSocketErrorBoundary>
  <CheckInComponent />
</WebSocketErrorBoundary>
```

## Integration Guidelines

### Adding a New WebSocket-Enabled Component

1. Use the `useWebSocket` hook to access WebSocket functionality:

```jsx
import { useWebSocket } from '../contexts/WebSocketContext';

const MyComponent = () => {
  const { subscribe, sendMessage, connectionStatus } = useWebSocket();
  
  // Subscribe to events
  useEffect(() => {
    const unsubscribe = subscribe('event_name', (data) => {
      // Handle event
    });
    
    return () => unsubscribe();
  }, [subscribe]);
  
  // Send messages
  const handleAction = () => {
    sendMessage('event_name', { data: 'value' });
  };
  
  return (
    // Component JSX
  );
};
```

2. Wrap the component with `WebSocketErrorBoundary` for error handling:

```jsx
<WebSocketErrorBoundary>
  <MyComponent />
</WebSocketErrorBoundary>
```

### Adding a New Event Type

1. Add the event type to the documentation (this file).
2. Define the event payload interface in `websocket-new.ts`.
3. Update the server-side WebSocket handler to support the new event.
4. Add appropriate tests for the new event.

## Testing

The WebSocket implementation includes comprehensive tests:

1. **Unit Tests**: Test individual components and methods of the WebSocket service.
2. **Integration Tests**: Test the interaction between WebSocket and other components.
3. **Mock WebSocket**: A mock WebSocket implementation for testing without a server.
4. **Connection Edge Cases**: Tests for reconnection, timeouts, and error handling.

Run the tests with:

```bash
npm test -- --testPathPattern=websocket
```

## Performance Monitoring

Monitor WebSocket performance using the browser's Developer Tools:

1. Network tab to inspect WebSocket messages
2. Memory tab to check for leaks
3. Performance tab to identify bottlenecks

For production monitoring, consider adding:

1. WebSocket connection analytics
2. Message volume metrics
3. Reconnection frequency tracking
