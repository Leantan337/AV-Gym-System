export interface CheckInFilters {
  search: string;
  status: 'all' | 'in' | 'out' | undefined;
  dateRange: string;
  page: number;
  perPage: number;
}
