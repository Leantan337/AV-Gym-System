export interface Member {
  id: string;
  photoUrl: string | null;
  first_name: string;
  last_name: string;
  email_address: string;
  phone_number: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  membership_type: string;
  membership_status: 'active' | 'inactive';
  membership: {
    join_date: string;
    expiry_date: string;
    startDate?: string;
    endDate?: string;
  };
  accessPrivileges: Array<{
    name: string;
    description: string;
    active: boolean;
  }>;
  recentActivity: Array<{
    type: string;
    date: string;
    description: string;
    timestamp: string;
  }>;
}
