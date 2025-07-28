import { api } from './api';

// Member interfaces that match the Django backend model
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Membership {
  plan: string;
  startDate: string;
  endDate: string | null;
}

// This should match what the Django backend expects
export interface MemberCreateUpdate {
  full_name: string;
  phone: string;
  address: string;
  membership_number?: string; // Optional as it can be auto-generated
  status: 'active' | 'inactive';
  notes?: string;
  // Note: We're removing the complex nested objects that don't exist in the backend
}

export interface MemberResponse {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  membership_number: string;
  status: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// Create member API methods
export const memberApi = {
  // Create a new member
  createMember: async (memberData: MemberCreateUpdate): Promise<MemberResponse> => {
    // Generate membership number if not provided
    if (!memberData.membership_number) {
      memberData.membership_number = `GYM${Date.now()}`;
    }
    
    const response = await api.post('/members/', memberData);
    return response.data;
  },

  // Update an existing member
  updateMember: async (memberId: string, memberData: Partial<MemberCreateUpdate>): Promise<MemberResponse> => {
    const response = await api.put(`/members/${memberId}/`, memberData);
    return response.data;
  },

  // Delete a member
  deleteMember: async (memberId: string): Promise<void> => {
    await api.delete(`/members/${memberId}/`);
  },

  // Get member check-ins
  getMemberCheckIns: async (memberId: string) => {
    const response = await api.get(`/members/${memberId}/checkins/`);
    return response.data;
  },

  // Get member payments
  getMemberPayments: async (memberId: string) => {
    const response = await api.get(`/members/${memberId}/payments/`);
    return response.data;
  },

  // Upload member photo
  uploadMemberPhoto: async (memberId: string, formData: FormData): Promise<{ image_url: string }> => {
    const response = await api.post(`/members/${memberId}/photo/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete member photo
  deleteMemberPhoto: async (memberId: string): Promise<void> => {
    await api.delete(`/members/${memberId}/photo/`);
  }
};
