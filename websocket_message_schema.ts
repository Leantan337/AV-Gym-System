// WebSocket Message Schema - Shared Contract Between Frontend & Backend
// This defines the standard message types and structures

export interface StandardMessage<T = unknown> {
  type: string;
  payload?: T;
  message?: string; // For error messages
  timestamp?: string;
}

// =============================================================================
// REAL-TIME UPDATE MESSAGES
// =============================================================================

export interface CheckInStatsUpdate {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

export interface MemberInfo {
  id: string;
  full_name: string;
  membership_type?: string;
}

export interface CheckInUpdate {
  id: string;
  member: MemberInfo;
  check_in_time: string;
  check_out_time?: string | null;
  location?: string;
  notes?: string;
}

// =============================================================================
// STANDARDIZED EVENT TYPES (Backend → Frontend)
// =============================================================================

export const WS_EVENTS = {
  // Connection & Setup
  INITIAL_STATS: 'initial_stats',
  STATS_UPDATE: 'stats_update',       // NEW: For real-time stats updates
  
  // Check-in/Check-out Events
  CHECK_IN_SUCCESS: 'check_in_success',
  CHECK_IN_ERROR: 'check_in_error',
  CHECK_OUT_SUCCESS: 'check_out_success', 
  CHECK_OUT_ERROR: 'check_out_error',
  
  // Real-time Broadcasts (these replace check_in_update)
  MEMBER_CHECKED_IN: 'member_checked_in',
  MEMBER_CHECKED_OUT: 'member_checked_out',
  
  // System Messages
  HEARTBEAT_ACK: 'heartbeat_ack',
  ERROR: 'error',
} as const;

// =============================================================================
// STANDARDIZED EVENT TYPES (Frontend → Backend)
// =============================================================================

export const WS_COMMANDS = {
  // Business Logic
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  
  // System
  HEARTBEAT: 'heartbeat',
  PING: 'ping',
} as const;

// =============================================================================
// MESSAGE TYPE DEFINITIONS
// =============================================================================

// Initial stats sent on connection
export type InitialStatsMessage = StandardMessage<CheckInStatsUpdate>;

// Real-time stats updates (NEW)
export type StatsUpdateMessage = StandardMessage<CheckInStatsUpdate>;

// Check-in success response
export type CheckInSuccessMessage = StandardMessage<CheckInUpdate>;

// Check-out success response  
export type CheckOutSuccessMessage = StandardMessage<CheckInUpdate>;

// Real-time member checked in broadcast
export type MemberCheckedInMessage = StandardMessage<CheckInUpdate>;

// Real-time member checked out broadcast
export type MemberCheckedOutMessage = StandardMessage<CheckInUpdate>;

// Error messages
export type ErrorMessage = StandardMessage<{ error: string }>;

// System messages
export type HeartbeatAckMessage = StandardMessage<{ timestamp: string }>;

// =============================================================================
// COMMAND PAYLOADS (Frontend → Backend)
// =============================================================================

export interface CheckInCommand {
  memberId: string;
  location?: string;
  notes?: string;
}

export interface CheckOutCommand {
  checkInId: string;
  notes?: string;
}

// =============================================================================
// MIGRATION PLAN
// =============================================================================

/*
FRONTEND CHANGES NEEDED:
1. Replace all 'check_in_update' subscriptions with:
   - 'member_checked_in' for individual check-ins
   - 'member_checked_out' for individual check-outs  
   - 'stats_update' for stats changes (NEW)

2. Update data structure expectations to match CheckInUpdate interface

BACKEND CHANGES NEEDED:
1. Add 'stats_update' broadcast when stats change
2. Ensure all message types match WS_EVENTS constants
3. Standardize payload structures

KEY BENEFITS:
✅ Clear separation between individual events and stats updates
✅ Consistent naming convention
✅ Type-safe message contracts
✅ Future-proof extensibility
*/
