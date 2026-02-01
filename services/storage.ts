
import { Staff, Client, TimesheetEntry } from '../types';

const KEYS = {
  STAFF: 'timesheet_staff_v3',
  CLIENTS: 'timesheet_clients_v3',
  ENTRIES: 'timesheet_entries_v3',
  THEME: 'timesheet_theme_v3'
};

export const storage = {
  getStaff: (): Staff[] => {
    const data = localStorage.getItem(KEYS.STAFF);
    return data ? JSON.parse(data) : [
      { id: '1', name: 'Raj Kumar', role: 'team-leader', email: 'raj@example.com', phone: '0400000000', startDate: '2024-01-01', active: true }
    ];
  },
  saveStaff: (staff: Staff[]) => localStorage.setItem(KEYS.STAFF, JSON.stringify(staff)),

  getClients: (): Client[] => {
    const data = localStorage.getItem(KEYS.CLIENTS);
    return data ? JSON.parse(data) : [
      { id: 'c1', name: 'John Doe', rates: { day: 25, evening: 28, night: 30, saturday: 37.5, sunday: 50, publicHoliday: 62.5, km: 0.85 } }
    ];
  },
  saveClients: (clients: Client[]) => localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients)),

  getEntries: (): TimesheetEntry[] => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },
  saveEntries: (entries: TimesheetEntry[]) => localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries)),

  getTheme: () => localStorage.getItem(KEYS.THEME) || 'dark',
  saveTheme: (theme: string) => localStorage.setItem(KEYS.THEME, theme)
};
