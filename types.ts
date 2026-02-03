
export enum UserRole {
  MANAGER = 'manager',
  STAFF = 'staff',
  CLIENT = 'client'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}

export interface Rates {
  day: number;
  evening: number;
  night: number;
  sleepover: number;
  saturday: number;
  sunday: number;
  publicHoliday: number;
  km: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  startDate: string;
  active: boolean;
  rates: Rates; // Rates moved to staff - different staff get different rates
}

export interface Client {
  id: string;
  name: string;
  // Rates removed - now on Staff
}

export interface TimesheetEntry {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  shiftType: 'day' | 'evening' | 'night' | 'sleepover';
  location: string;
  startTime: string;
  endTime: string;
  hours: number;
  km: number;
  workEarnings: number;
  travelEarnings: number;
  totalEarnings: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  syncedToCloud?: boolean; // New sync status
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
