
import { TimesheetEntry, Staff, Client } from '../types';

// Debounce helper to prevent too many sync calls
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
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
   * Sync all data to Google Sheets using hidden iframe form submission
   */
  syncAllData: async (webhookUrl: string, data: SyncData) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");

    return new Promise((resolve) => {
      const payload = {
        timestamp: new Date().toISOString(),
        type: 'FULL_SYNC',
        timesheets: data.timesheets,
        staff: data.staff,
        clients: data.clients
      };

      // Create hidden iframe for form submission (bypasses CORS)
      const iframeName = 'mist_sync_frame_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      // Create form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = webhookUrl;
      form.target = iframeName;
      form.style.display = 'none';

      // Add data as hidden input
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'data';
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(form);

      // Submit form
      form.submit();

      // With cross-origin iframes, we can't detect completion
      // So we assume success after a short delay and clean up
      setTimeout(() => {
        try {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch (e) {
          // Ignore cleanup errors
        }
        resolve(true);
      }, 1500);
    });
  },

  /**
   * Load data from Google Sheets using JSONP (bypasses CORS)
   */
  loadFromCloud: async (webhookUrl: string): Promise<SyncData | null> => {
    if (!webhookUrl) return null;

    return new Promise((resolve) => {
      // Create unique callback name
      const callbackName = 'mistCallback_' + Date.now();

      // Create global callback function
      (window as any)[callbackName] = (data: any) => {
        // Clean up
        delete (window as any)[callbackName];
        const script = document.getElementById(callbackName);
        if (script) script.remove();

        if (data && data.success !== false) {
          resolve({
            timesheets: data.timesheets || [],
            staff: data.staff || [],
            clients: data.clients || []
          });
        } else {
          console.error('Cloud load error:', data?.error);
          resolve(null);
        }
      };

      // Create script tag for JSONP
      const script = document.createElement('script');
      script.id = callbackName;
      script.src = webhookUrl + '?callback=' + callbackName;
      script.onerror = () => {
        delete (window as any)[callbackName];
        script.remove();
        console.error('JSONP script load failed');
        resolve(null);
      };

      document.body.appendChild(script);

      // Timeout after 15 seconds
      setTimeout(() => {
        if ((window as any)[callbackName]) {
          delete (window as any)[callbackName];
          const s = document.getElementById(callbackName);
          if (s) s.remove();
          resolve(null);
        }
      }, 15000);
    });
  },

  /**
   * Pushes entries to a Google Sheets Webhook URL (legacy - kept for compatibility)
   */
  syncToGoogleSheets: async (webhookUrl: string, entries: TimesheetEntry[]) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");

    try {
      const payload = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'SYNC_REPORTS',
        data: entries
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
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
