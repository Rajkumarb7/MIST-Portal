
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
   * Sync all data to Google Sheets.
   * Uses fetch with no-cors mode — works reliably on all browsers including mobile Safari.
   * Falls back to hidden iframe form submission if fetch throws (very rare).
   */
  syncAllData: async (webhookUrl: string, data: SyncData) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");

    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'FULL_SYNC',
      timesheets: data.timesheets,
      staff: data.staff,
      clients: data.clients
    });

    try {
      // no-cors sends a simple cross-origin POST — no preflight, works on all browsers.
      // Response is opaque (unreadable) but the Apps Script receives and processes the body.
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
    } catch {
      // Fallback: hidden iframe form submission (desktop browsers, legacy)
      await new Promise<void>((resolve) => {
        const iframeName = 'mist_sync_' + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = webhookUrl;
        form.target = iframeName;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = payload;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();

        setTimeout(() => {
          try {
            if (document.body.contains(form)) document.body.removeChild(form);
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          } catch { /* ignore cleanup errors */ }
          resolve();
        }, 4000); // longer timeout for slow mobile connections
      });
    }

    // Brief pause so the Apps Script can finish writing before any subsequent read
    await new Promise(r => setTimeout(r, 2000));
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
