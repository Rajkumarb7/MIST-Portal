
import { TimesheetEntry, Staff, Client } from '../types';

// Debounce helper to prevent too many sync calls
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DELAY = 2000; // 2 seconds after last change

interface SyncData {
  timesheets: TimesheetEntry[];
  staff: Staff[];
  clients: Client[];
}

interface SyncStatus {
  lastSync: string | null;
  pending: boolean;
  error: string | null;
}

// In-memory sync status
let syncStatus: SyncStatus = {
  lastSync: null,
  pending: false,
  error: null
};

export const syncService = {
  /**
   * Get current sync status
   */
  getStatus: () => syncStatus,

  /**
   * Auto-sync with debouncing - call this whenever data changes
   */
  autoSync: (webhookUrl: string | null, data: SyncData) => {
    if (!webhookUrl) {
      console.log('Sync skipped: No webhook URL configured');
      return;
    }

    // Clear existing timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncStatus.pending = true;

    // Debounce - wait for changes to stop before syncing
    syncTimeout = setTimeout(async () => {
      try {
        await syncService.syncAllData(webhookUrl, data);
        syncStatus.lastSync = new Date().toISOString();
        syncStatus.pending = false;
        syncStatus.error = null;
        console.log('Auto-sync completed:', syncStatus.lastSync);
      } catch (error) {
        syncStatus.pending = false;
        syncStatus.error = (error as Error).message;
        console.error('Auto-sync failed:', error);
      }
    }, SYNC_DELAY);
  },

  /**
   * Sync all data to Google Sheets
   */
  syncAllData: async (webhookUrl: string, data: SyncData) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'FULL_SYNC',
          timesheets: data.timesheets,
          staff: data.staff,
          clients: data.clients
        })
      });
      return true;
    } catch (error) {
      console.error("Full sync failed:", error);
      throw error;
    }
  },

  /**
   * Load data from Google Sheets on startup
   */
  loadFromCloud: async (webhookUrl: string): Promise<SyncData | null> => {
    if (!webhookUrl) return null;

    try {
      // For Google Apps Script, we need to use a GET request
      const response = await fetch(webhookUrl + '?action=read', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from cloud');
      }

      const data = await response.json();
      return {
        timesheets: data.timesheets || [],
        staff: data.staff || [],
        clients: data.clients || []
      };
    } catch (error) {
      console.error("Load from cloud failed:", error);
      return null;
    }
  },

  /**
   * Pushes entries to a Google Sheets Webhook URL (legacy - kept for compatibility)
   */
  syncToGoogleSheets: async (webhookUrl: string, entries: TimesheetEntry[]) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'SYNC_REPORTS',
          data: entries
        })
      });
      return true;
    } catch (error) {
      console.error("Sync failed:", error);
      throw error;
    }
  },

  /**
   * Generates a mailto link for manual reporting
   */
  generateEmailReport: (managerEmail: string, entries: TimesheetEntry[]) => {
    const subject = `MIST Timesheet Report - ${new Date().toLocaleDateString()}`;
    const body = entries.map(e => (
      `Date: ${e.date}\nStaff: ${e.staffName}\nClient: ${e.clientName}\nHours: ${e.hours}\nEarnings: $${e.totalEarnings}\nNotes: ${e.notes}\n---`
    )).join('\n\n');

    return `mailto:${managerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
};
