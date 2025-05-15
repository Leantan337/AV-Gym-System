# Check-in Module Documentation

## Overview
The Check-in Module provides a comprehensive system for managing gym member check-ins and check-outs. It supports both barcode scanning and manual entry methods, with real-time status updates and detailed history tracking.

## Components

### 1. BarcodeScanner
- **Purpose**: Handles barcode input from external scanners
- **Features**:
  - Real-time barcode detection
  - Duplicate scan prevention (1-second cooldown)
  - Error handling
  - Visual feedback
- **Usage**:
```tsx
<BarcodeScanner onScan={(code) => handleScan(code)} />
```

### 2. ManualEntryForm
- **Purpose**: Alternative check-in method using member search
- **Features**:
  - Real-time member search
  - Autocomplete suggestions
  - Form validation
  - Loading states
- **Usage**:
```tsx
<ManualEntryForm onSubmit={(memberId) => handleCheckIn(memberId)} />
```

### 3. CheckInStatus
- **Purpose**: Display real-time gym occupancy statistics
- **Features**:
  - Current member count
  - Daily total check-ins
  - Average stay duration
  - WebSocket updates
- **Usage**:
```tsx
<CheckInStatus />
```

### 4. CheckInHistory
- **Purpose**: View and manage check-in records
- **Features**:
  - Pagination
  - Search functionality
  - Status filtering
  - Date range filtering
  - Check-out actions
- **Usage**:
```tsx
<CheckInHistory
  checkIns={data.checkIns}
  isLoading={isLoading}
  error={error}
  totalCount={data.totalCount}
  onFilter={handleFilter}
/>
```

## WebSocket Integration

### Connection
The module uses WebSocket for real-time updates:
```typescript
wsService.connect();
wsService.subscribe('check_in_update', handleUpdate);
```

### Message Types
1. Check-in Update:
```typescript
{
  type: 'check_in',
  checkIn: {
    id: string;
    member: {
      id: string;
      fullName: string;
    };
    checkInTime: string;
    checkOutTime: string | null;
  }
}
```

## API Endpoints

### Check-in Operations
- `POST /check-ins/`: Create new check-in
- `POST /check-ins/:id/check-out`: Record check-out
- `GET /check-ins/`: List check-ins with filters
- `GET /check-ins/stats/`: Get current statistics

### Query Parameters
- `search`: Search by member name/number
- `status`: Filter by 'in'/'out'/'all'
- `dateRange`: 'today'/'yesterday'/'week'/'all'
- `page`: Page number
- `perPage`: Items per page

## Error Handling
- Network errors: Retry with exponential backoff
- Invalid barcode formats: Show clear error message
- Member not found: Suggest manual entry
- Already checked in/out: Show last check-in time
- WebSocket connection issues: Fallback to polling

## Best Practices
1. Always handle WebSocket disconnections gracefully
2. Implement proper error feedback with actionable messages
3. Use debouncing for search inputs (300ms)
4. Maintain proper loading states for better UX
5. Keep UI responsive with pagination (10 items/page)
6. Prevent duplicate check-ins within 1 second
7. Use proper TypeScript types for type safety
8. Follow Material-UI design patterns

## Testing
1. Unit Tests:
   - BarcodeScanner input handling
   - ManualEntryForm validation
   - CheckInHistory filtering
   - WebSocket message processing

2. Integration Tests:
   - Check-in flow
   - Search functionality
   - Real-time updates
   - Error scenarios

## Future Improvements
1. Offline support with local storage
2. Batch check-in for groups/classes
3. Advanced analytics and reporting
4. Custom date range filters
5. Export functionality (CSV/PDF)
6. Member photo verification
7. Mobile app integration
8. Automated notifications
