
import { TimesheetEntry } from '../types';

export const syncService = {
  /**
   * Pushes entries to a Google Sheets Webhook URL
   */
  syncToGoogleSheets: async (webhookUrl: string, entries: TimesheetEntry[]) => {
    if (!webhookUrl) throw new Error("Webhook URL not configured");
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // Common for Google Script Webhooks
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
