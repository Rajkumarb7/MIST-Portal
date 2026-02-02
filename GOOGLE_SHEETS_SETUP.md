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
ID | Date | Staff ID | Staff Name | Client ID | Client Name | Service Type | Shift Type | Location | Start Time | End Time | Hours | KM | Work Earnings | Travel Earnings | Total Earnings | Notes | Status
```

**Staff sheet - Row 1:**
```
ID | Name | Role | Email | Phone | Start Date | Active
```

**Clients sheet - Row 1:**
```
ID | Name | Day Rate | Evening Rate | Night Rate | Sleepover Rate | Saturday Rate | Sunday Rate | Holiday Rate | KM Rate
```

---

## Step 2: Add the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code
3. Paste this entire script:

```javascript
// MIST Portal Sync Script v2.0
// This script handles bi-directional sync with the MIST Portal

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Handle different sync types
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
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;

    if (action === 'read') {
      return ContentService.createTextOutput(JSON.stringify({
        timesheets: readSheet(ss, 'Timesheets'),
        staff: readSheet(ss, 'Staff'),
        clients: readSheet(ss, 'Clients')
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'MIST Portal Sync Service Active'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncTimesheets(ss, entries) {
  const sheet = ss.getSheetByName('Timesheets');
  if (!sheet) return;

  // Clear existing data (keep header)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  // Add new data
  entries.forEach(entry => {
    sheet.appendRow([
      entry.id,
      entry.date,
      entry.staffId,
      entry.staffName,
      entry.clientId,
      entry.clientName,
      entry.serviceType,
      entry.shiftType,
      entry.location || '',
      entry.startTime,
      entry.endTime,
      entry.hours,
      entry.km,
      entry.workEarnings,
      entry.travelEarnings,
      entry.totalEarnings,
      entry.notes || '',
      entry.status
    ]);
  });
}

function syncStaff(ss, staffList) {
  const sheet = ss.getSheetByName('Staff');
  if (!sheet) return;

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  staffList.forEach(staff => {
    sheet.appendRow([
      staff.id,
      staff.name,
      staff.role,
      staff.email || '',
      staff.phone || '',
      staff.startDate || '',
      staff.active ? 'Yes' : 'No'
    ]);
  });
}

function syncClients(ss, clientList) {
  const sheet = ss.getSheetByName('Clients');
  if (!sheet) return;

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  clientList.forEach(client => {
    sheet.appendRow([
      client.id,
      client.name,
      client.rates?.day || 0,
      client.rates?.evening || 0,
      client.rates?.night || 0,
      client.rates?.sleepover || 0,
      client.rates?.saturday || 0,
      client.rates?.sunday || 0,
      client.rates?.publicHoliday || 0,
      client.rates?.km || 0
    ]);
  });
}

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.toLowerCase().replace(/ /g, '')] = row[i];
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
   - **Description:** "MIST Portal Sync"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
5. Click **Deploy**
6. Click **Authorize access** and sign in with your Google account
7. **COPY THE WEB APP URL** - you'll need this!

The URL looks like: `https://script.google.com/macros/s/XXXXX.../exec`

---

## Step 4: Configure MIST Portal

1. Log into your MIST Portal as Manager
2. Go to **Portal Settings**
3. Paste the Web App URL in the **"Google Apps Script Webhook"** field
4. Set the **Reporting Email** to `admin@mistau.com`
5. Click **Save Sync Settings**

---

## Step 5: Test It!

1. Go to **Shift Logs** and add a new entry
2. Wait 2-3 seconds
3. Check your Google Sheet - the data should appear!
4. Look at the header bar - you'll see a "Syncing..." indicator when changes are being saved

---

## How It Works

- **Auto-Sync:** Every time you add, edit, or delete data, it automatically syncs after 2 seconds
- **All Data Types:** Timesheets, Staff, and Clients all sync together
- **Status Indicator:** The header shows sync status (Syncing, Synced, Error)
- **Offline Support:** Data is always saved locally first, so you never lose work

---

## Troubleshooting

### "Sync Error" in header
- Check your internet connection
- Verify the webhook URL is correct in Portal Settings
- Make sure you authorized the Apps Script properly

### Data not appearing in Sheet
- Ensure the sheet names are exactly: "Timesheets", "Staff", "Clients"
- Check that headers are in row 1

### Script errors
- Go to Extensions → Apps Script → Executions to see error logs

---

## Security Notes

- Your data is stored in YOUR Google account
- Only you (and people you share the sheet with) can see it
- The webhook URL should be kept private
- Consider restricting sheet access to managers only

---

## Need Help?

Contact: admin@mistau.com
