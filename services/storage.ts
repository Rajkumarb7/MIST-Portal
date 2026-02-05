
import { Staff, Client, TimesheetEntry } from '../types';

const KEYS = {
  STAFF: 'timesheet_staff_v3',
  CLIENTS: 'timesheet_clients_v3',
  ENTRIES: 'timesheet_entries_v3',
  THEME: 'timesheet_theme_v3'
};

// Default rates for new staff members
const DEFAULT_RATES = {
  day: 65,
  evening: 72,
  night: 85,
  sleepover: 250,
  saturday: 95,
  sunday: 125,
  publicHoliday: 160,
  km: 0.96
};

export const storage = {
  getStaff: (): Staff[] => {
    const data = localStorage.getItem(KEYS.STAFF);
    if (data) {
      // Ensure all staff have rates (migration for existing data)
      const staff = JSON.parse(data);
      return staff.map((s: Staff) => ({
        ...s,
        rates: s.rates || DEFAULT_RATES
      }));
    }
    return [
      { id: '1', name: 'Raj Kumar', role: 'team-leader', email: 'raj@example.com', phone: '0400000000', startDate: '2024-01-01', active: true, rates: DEFAULT_RATES }
    ];
  },
  saveStaff: (staff: Staff[]) => localStorage.setItem(KEYS.STAFF, JSON.stringify(staff)),

  getClients: (): Client[] => {
    const data = localStorage.getItem(KEYS.CLIENTS);
    if (data) {
      // Sanitize client data - only keep id and name (rates were moved to staff)
      const clients = JSON.parse(data);
      return clients.map((c: any) => ({
        id: c.id || String(Date.now()),
        name: String(c.name || 'Unknown Client')
      })).filter((c: Client) => {
        // Filter out clients with numeric-only names (likely corrupted rate data)
        const isNumericOnly = /^\d+(\.\d+)?$/.test(c.name);
        return c.id && c.name && c.name !== 'Unknown Client' && !isNumericOnly;
      });
    }
    return [
      { id: 'c1', name: 'John Doe' }
    ];
  },
  saveClients: (clients: Client[]) => {
    // Only save id and name for clients
    const sanitized = clients.map(c => ({ id: c.id, name: c.name }));
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(sanitized));
  },

  getEntries: (): TimesheetEntry[] => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },
  saveEntries: (entries: TimesheetEntry[]) => localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries)),

  getTheme: () => localStorage.getItem(KEYS.THEME) || 'dark',
  saveTheme: (theme: string) => localStorage.setItem(KEYS.THEME, theme)
};
