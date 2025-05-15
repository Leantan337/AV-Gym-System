export interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_status: 'active' | 'inactive' | 'pending';
  membership_type: string;
  join_date: string;
  expiry_date: string | null;
}
