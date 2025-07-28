// Types that match the Django backend Member model
export interface Member {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  membership_number: string;
  status: 'active' | 'inactive';
  image?: string;
  image_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MemberCreateUpdate {
  full_name: string;
  phone: string;
  address: string;
  membership_number?: string; // Optional as it can be auto-generated
  status: 'active' | 'inactive';
  notes?: string;
}

// Form-specific types for the UI
export interface MemberFormData {
  first_name: string;
  last_name: string;
  email: string; // Not saved to backend, but used in form
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  notes?: string;
  // UI-only fields for future features
  membership_type?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  access_privileges?: string[];
}

// Utility functions to transform between UI and API formats
export const transformFormToApi = (formData: MemberFormData): MemberCreateUpdate => {
  return {
    full_name: `${formData.first_name} ${formData.last_name}`.trim(),
    phone: formData.phone,
    address: formData.address,
    status: formData.status,
    notes: formData.notes || '',
  };
};

export const transformApiToForm = (member: Member): MemberFormData => {
  const nameParts = member.full_name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return {
    first_name: firstName,
    last_name: lastName,
    email: '', // Not available from backend
    phone: member.phone,
    address: member.address,
    status: member.status,
    notes: member.notes || '',
  };
};
