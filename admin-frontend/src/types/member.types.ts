export interface Membership {
  join_date: string;
  expiry_date: string;
  type: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  photo_url?: string;
  membership: Membership;
  emergency_contact: EmergencyContact;
  access_privileges: string[];
  created_at?: string;
  updated_at?: string;
}

export interface MemberCreateUpdate {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  membership: {
    type: string;
    status: 'active' | 'inactive' | 'pending';
    join_date: string;
    expiry_date: string;
  };
  emergency_contact: EmergencyContact;
  access_privileges: string[];
}
