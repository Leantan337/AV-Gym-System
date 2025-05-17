import { api } from './api';

// Member interfaces
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

export interface MemberCreateUpdate {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  membershipNumber: string;
  status: 'active' | 'inactive' | 'pending';
  membership: Membership;
  emergencyContact: EmergencyContact;
  accessPrivileges: string[];
}

export interface MemberResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  membershipNumber: string;
  status: string;
  membership: Membership;
  emergencyContact: EmergencyContact;
  accessPrivileges: string[];
  imageUrl?: string;
}

// Create member API methods
export const memberApi = {
  // Create a new member
  createMember: async (memberData: MemberCreateUpdate): Promise<MemberResponse> => {
    const response = await api.post('/members/', memberData);
    return response.data;
  },

  // Update an existing member
  updateMember: async (memberId: string, memberData: MemberCreateUpdate): Promise<MemberResponse> => {
    const response = await api.put(`/members/${memberId}/`, memberData);
    return response.data;
  },

  // Delete a member
  deleteMember: async (memberId: string): Promise<void> => {
    await api.delete(`/members/${memberId}/`);
  },

  // Get member check-ins
  getMemberCheckIns: async (memberId: string) => {
    const response = await api.get(`/members/${memberId}/check-ins/`);
    return response.data;
  },

  // Get member payments
  getMemberPayments: async (memberId: string) => {
    const response = await api.get(`/members/${memberId}/payments/`);
    return response.data;
  },

  // Upload member photo
  uploadMemberPhoto: async (memberId: string, formData: FormData): Promise<{ imageUrl: string }> => {
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
