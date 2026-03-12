# MIST Portal - Google Sheets Auto-Sync Setup

## Overview
This guide will help you set up automatic syncing between your MIST Portal and Google Sheets. Once configured, all data changes will automatically sync to your Google Sheet within 2 seconds.

---

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it **"MIST Portal Database"**
4. Create 3 sheets (tabs at the bottom):
   - **Timesheets**
   - **Staff**
   - **Clients**

### Sheet Headers (Copy these exactly):

**Timesheets sheet - Row 1:**
```
ID | Date | Staff ID | Staff Name | Client ID | Client Name | Service Type | Shift Type | Location | Start Time | End Time | Hours | KM | Work Earnings | Travel Earnings | Total Earnings | Public Holiday | Notes | Status
```

**Staff sheet - Row 1:**
```
ID | Name | Role | Email | Phone | Start Date | Active | Day Rate | Evening Rate | Night Rate | Sleepover Rate | Saturday Rate | Sunday Rate | Holiday Rate | KM Rate
```

**Clients sheet - Row 1:**
```
ID | Name
```

> ⚠️ **Important for existing sheets:** If you already have data in your sheet, you'll need to add the new columns manually:
> - **Timesheets:** Add `Public Holiday` column between `Total Earnings` and `Notes`
> - **Staff:** Add rate columns after `Active`: `Day Rate | Evening Rate | Night Rate | Sleepover Rate | Saturday Rate | Sunday Rate | Holiday Rate | KM Rate`
> - **Clients:** Remove old rate columns — only `ID | Name` are needed now (rates live on Staff)
>
> After adding the new columns, do a fresh Push from the app (Shift Logs → Push to Cloud) to repopulate all data.

---

## Step 2: Add the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code
3. Paste this entire script:

```javascript
// MIST Portal Sync Script v3.1
// Handles bi-directional sync with the MIST Portal web app

function doPost(e) {
  try {
    // Support both JSON body and hidden form submission (iframe trick)
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      throw new Error('No data received');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'FULL_SYNC') {
      syncTimesheets(ss, data.timesheets || []);
      syncStaff(ss, data.staff || []);
      syncClients(ss, data.clients || []);
    } else if (data.type === 'SYNC_REPORTS') {
      syncTimesheets(ss, data.data || []);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const callback = e.parameter.callback;

    const result = JSON.stringify({
      success: true,
      timesheets: readSheet(ss, 'Timesheets'),
      staff: readSheet(ss, 'Staff'),
      clients: readSheet(ss, 'Clients')
    });

    // JSONP response — required for browser-based CORS-free requests
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + result + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // Plain JSON for direct access
    return ContentService.createTextOutput(result)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errResult = JSON.stringify({ success: false, error: error.message });
    const callback = e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + errResult + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errResult)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncTimesheets(ss, entries) {
  const sheet = ss.getSheetByName('Timesheets');
  if (!sheet) return;

  // Always write headers in row 1 so readSheet can map all fields correctly
  sheet.getRange(1, 1, 1, 19).setValues([[
    'id','date','staffId','staffName','clientId','clientName',
    'serviceType','shiftType','location','startTime','endTime',
    'hours','km','workEarnings','travelEarnings','totalEarnings',
    'isPublicHoliday','notes','status'
  ]]);

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  entries.forEach(function(entry) {
    // Force date to plain YYYY-MM-DD string — prevents Google Sheets from
    // auto-converting to a Date serial and returning ISO timestamps on read
    var dateStr = String(entry.date || '').substring(0, 10);
    sheet.appendRow([
      String(entry.id || ''),
      dateStr,
      String(entry.staffId || ''),
      String(entry.staffName || ''),
      String(entry.clientId || ''),
      String(entry.clientName || ''),
      String(entry.serviceType || ''),
      String(entry.shiftType || ''),
      String(entry.location || ''),
      String(entry.startTime || ''),
      String(entry.endTime || ''),
      Number(entry.hours || 0),
      Number(entry.km || 0),
      Number(entry.workEarnings || 0),
      Number(entry.travelEarnings || 0),
      Number(entry.totalEarnings || 0),
      entry.isPublicHoliday ? 'Yes' : 'No',
      String(entry.notes || ''),
      String(entry.status || 'pending')
    ]);
  });
}

function syncStaff(ss, staffList) {
  const sheet = ss.getSheetByName('Staff');
  if (!sheet) return;

  // Always write headers in row 1 — this is critical so readSheet returns
  // dayrate, eveningrate etc. fields that the app uses to read back rates
  sheet.getRange(1, 1, 1, 15).setValues([[
    'id','name','role','email','phone','startDate','active',
    'dayrate','eveningrate','nightrate','sleepoverrate',
    'saturdayrate','sundayrate','holidayrate','kmrate'
  ]]);

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  staffList.forEach(function(staff) {
    var rates = staff.rates || {};
    sheet.appendRow([
      String(staff.id || ''),
      String(staff.name || ''),
      String(staff.role || ''),
      String(staff.email || ''),
      String(staff.phone || ''),
      String(staff.startDate || ''),
      staff.active ? 'Yes' : 'No',
      Number(rates.day || 65),
      Number(rates.evening || 72),
      Number(rates.night || 85),
      Number(rates.sleepover || 250),
      Number(rates.saturday || 95),
      Number(rates.sunday || 125),
      Number(rates.publicHoliday || 160),
      Number(rates.km || 0.96)
    ]);
  });
}

function syncClients(ss, clientList) {
  const sheet = ss.getSheetByName('Clients');
  if (!sheet) return;

  // Always write headers in row 1
  sheet.getRange(1, 1, 1, 2).setValues([['id','name']]);

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  // Deduplicate by name before writing (prevents double-Patrick etc.)
  var seen = {};
  clientList.forEach(function(client) {
    var key = String(client.name || '').toLowerCase().trim();
    if (!key || seen[key]) return;
    seen[key] = true;
    sheet.appendRow([
      String(client.id || ''),
      String(client.name || '')
    ]);
  });
}

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      const key = String(header).toLowerCase().replace(/\s+/g, '');
      let val = row[i];
      // Convert any Date objects to plain YYYY-MM-DD strings
      // (Google Sheets stores dates as Date objects internally)
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[key] = val;
    });
    return obj;
  });
}
```

---

## Step 3: Deploy the Script

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Fill in:
   - **Description:** "MIST Portal Sync v3.1"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
5. Click **Deploy**
6. Click **Authorize access** and sign in with your Google account
7. **COPY THE WEB APP URL** - you'll need this!

The URL looks like: `https://script.google.com/macros/s/XXXXX.../exec`

> ⚠️ **Updating an existing deployment?** After replacing the script code, go to **Deploy → Manage deployments**, click the pencil icon on your existing deployment, change the version to **"New version"**, then click **Deploy**. This is critical — changes to the script code do NOT take effect on the old deployment automatically.

---

## Step 4: Configure MIST Portal

1. Log into your MIST Portal as Manager
2. Go to **Portal Settings**
3. Paste the Web App URL in the **"Google Apps Script Webhook"** field
4. Set the **Reporting Email** destination if needed
5. Click **Save Sync Settings**

---

## Step 5: Test It!

1. Go to **Shift Logs** and click **Push to Cloud** (cloud upload icon)
2. Wait 3-5 seconds
3. Check your Google Sheet — all timesheets, staff, and clients should appear
4. On another device, log in and click **Pull from Cloud** (cloud download icon) in Shift Logs
5. Staff, Clients, and Timesheets should all load correctly

---

## How It Works

- **Auto-Sync:** Every time you add, edit, or delete timesheet data, it automatically syncs after 2 seconds
- **Push:** Manually push all data (Staff + Clients + Timesheets) to Google Sheets at any time
- **Pull:** Load all data (Staff + Clients + Timesheets) from Google Sheets — use this on a new device to get the full team data
- **Date format:** Dates are stored as plain `YYYY-MM-DD` text in the sheet (e.g. `2026-02-16`) to avoid timezone issues
- **Public Holiday:** Shifts marked as Public Holiday sync as `Yes`/`No` in the sheet
- **Staff Rates:** All hourly rates now live on the Staff sheet, not the Clients sheet

---

## Troubleshooting

### "Sync Error" in header
- Check your internet connection
- Verify the webhook URL is correct in Portal Settings
- Make sure you authorized the Apps Script properly

### Dates showing as "Invalid Date" in the app
- The sheet's Date column is formatted as a Date cell. Fix: Select the Date column → Format → Number → Plain Text. Then re-push from the app.
- Or redeploy the updated v3.1 script — it forces dates to be stored as strings.

### Pull doesn't load Staff / Clients
- Ensure the sheet tab names are exactly: `Timesheets`, `Staff`, `Clients` (case-sensitive)
- Ensure headers are in row 1 exactly as shown above
- Try accessing your webhook URL directly in a browser — you should see JSON with `timesheets`, `staff`, and `clients` arrays

### Data not appearing in Sheet
- Ensure the sheet names are exactly: "Timesheets", "Staff", "Clients"
- Check that headers are in row 1

### Script errors / "Exceeded maximum execution time"
- Go to Extensions → Apps Script → Executions to see error logs
- Very large datasets (500+ entries) may time out — contact admin@mistau.com

---

## Security Notes

- Your data is stored in YOUR Google account
- Only you (and people you share the sheet with) can see it
- The webhook URL should be kept private — it gives anyone read/write access to your sheet
- Consider restricting sheet sharing to managers only

---

## Need Help?

Contact: admin@mistau.com

---

*Setup Guide v3.1 — Updated February 2026*
