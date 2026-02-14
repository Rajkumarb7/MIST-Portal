# MIST Portal - Google Sheets Sync Troubleshooting Guide

## Current Issue
Data is stored in your laptop browser's localStorage but NOT syncing to Google Sheets. You cannot access data from other devices/browsers.

---

## Step-by-Step Fix

### STEP 1: Verify Google Sheet Structure

Your Google Sheet must have **exactly 3 tabs** with these names (case-sensitive):

1. **Timesheets**
2. **Staff**
3. **Clients**

#### Required Headers (Row 1 in each sheet):

**Timesheets sheet:**
```
ID | Date | Staff ID | Staff Name | Client ID | Client Name | Service Type | Shift Type | Location | Start Time | End Time | Hours | KM | Work Earnings | Travel Earnings | Total Earnings | Notes | Status
```

**Staff sheet:**
```
ID | Name | Role | Email | Phone | Start Date | Active | Day Rate | Evening Rate | Night Rate | Sleepover Rate | Saturday Rate | Sunday Rate | Holiday Rate | KM Rate
```

**Clients sheet:**
```
ID | Name
```

**Action:**
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1OhaAYWAUhi5YLlrf91HOmAKUCFouKenjZs2oPfi7wBM/edit
2. Check that you have these 3 tabs at the bottom
3. If missing, create them by clicking the + button
4. Copy the exact headers above into Row 1 of each sheet

---

### STEP 2: Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code
3. Copy and paste this COMPLETE script:

```javascript
// MIST Portal Sync Script v2.0 - COMPLETE VERSION

function doPost(e) {
  try {
    // Parse the incoming POST data
    const postData = e.postData.contents;
    let data;

    // Handle different POST formats
    if (e.postData.type === 'application/json') {
      data = JSON.parse(postData);
    } else {
      // Handle form-encoded data (from iframe submission)
      const params = e.parameter;
      if (params.data) {
        data = JSON.parse(params.data);
      } else {
        data = JSON.parse(postData);
      }
    }

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
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const callback = e.parameter.callback;

    // Read all data from sheets
    const responseData = {
      success: true,
      timesheets: readSheet(ss, 'Timesheets'),
      staff: readSheet(ss, 'Staff'),
      clients: readSheet(ss, 'Clients'),
      timestamp: new Date().toISOString()
    };

    // If callback parameter exists, return JSONP for CORS bypass
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(responseData) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // Otherwise return regular JSON
    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());

    const errorResponse = {
      success: false,
      error: error.message
    };

    const callback = e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncTimesheets(ss, entries) {
  const sheet = ss.getSheetByName('Timesheets');
  if (!sheet) {
    Logger.log('ERROR: Timesheets sheet not found!');
    return;
  }

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

  Logger.log('Synced ' + entries.length + ' timesheet entries');
}

function syncStaff(ss, staffList) {
  const sheet = ss.getSheetByName('Staff');
  if (!sheet) {
    Logger.log('ERROR: Staff sheet not found!');
    return;
  }

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
      staff.active ? 'Yes' : 'No',
      staff.rates?.day || 0,
      staff.rates?.evening || 0,
      staff.rates?.night || 0,
      staff.rates?.sleepover || 0,
      staff.rates?.saturday || 0,
      staff.rates?.sunday || 0,
      staff.rates?.publicHoliday || 0,
      staff.rates?.km || 0
    ]);
  });

  Logger.log('Synced ' + staffList.length + ' staff members');
}

function syncClients(ss, clientList) {
  const sheet = ss.getSheetByName('Clients');
  if (!sheet) {
    Logger.log('ERROR: Clients sheet not found!');
    return;
  }

  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  clientList.forEach(client => {
    sheet.appendRow([
      client.id,
      client.name
    ]);
  });

  Logger.log('Synced ' + clientList.length + ' clients');
}

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('Sheet ' + sheetName + ' is empty or not found');
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, ''));

  Logger.log('Reading ' + sheetName + ' with headers: ' + headers.join(', '));

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}
```

4. Click **Save** (disk icon)
5. Name the project "MIST Portal Sync"

---

### STEP 3: Deploy the Apps Script

This is **CRITICAL** - without proper deployment, sync will NOT work.

1. In Apps Script, click **Deploy → New deployment**
2. Click the ⚙️ (gear icon) next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description:** MIST Portal Sync
   - **Execute as:** Me (your email)
   - **Who has access:** **Anyone** (IMPORTANT!)
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to MIST Portal Sync (unsafe)**
9. Click **Allow**
10. **COPY THE WEB APP URL** - it looks like:
    ```
    https://script.google.com/macros/s/AKfycby.../exec
    ```

**IMPORTANT:** You MUST copy this URL exactly. It should end with `/exec`

---

### STEP 4: Configure MIST Portal

1. Open your MIST Portal: https://rajkumarb7.github.io/MIST-Portal/
2. Log in as Manager (password: benjo234)
3. Go to **Portal Settings** (sidebar)
4. Under "Cloud & Google Sheets", paste your webhook URL in the **"Google Apps Script Webhook"** field
5. Click **"Save Sync Settings"**
6. You should see a success message

---

### STEP 5: Test the Sync

#### Test 1: Push Data to Google Sheets

1. In MIST Portal, go to **Shift Logs**
2. Add a new timesheet entry (any data is fine for testing)
3. Wait 2-3 seconds
4. Check the header bar - you should see "Syncing..." then "Synced" with green checkmark
5. Open your Google Sheet
6. Check the **Timesheets** tab - your entry should appear in row 2!

**If it doesn't work:**
- Open browser console (F12 → Console tab)
- Look for errors
- Check that webhook URL ends with `/exec`
- Verify the Apps Script is deployed with "Anyone" access

#### Test 2: Load Data from Google Sheets to New Browser

1. Open an **Incognito/Private window** (or different browser)
2. Go to: https://rajkumarb7.github.io/MIST-Portal/
3. On the login screen, click **"Connect to Team"** button (at bottom)
4. Paste your webhook URL
5. Click **"CONNECT & SYNC"**
6. Wait for "Loading Team Data..."
7. The app should reload with your data!
8. Log in and verify your staff, clients, and timesheets are present

---

## Common Issues & Solutions

### Issue: "Syncing..." never changes to "Synced"

**Cause:** Apps Script not deployed or wrong URL

**Fix:**
1. Re-check Step 3 deployment
2. Verify URL ends with `/exec` not `/dev`
3. Ensure "Who has access" is set to "Anyone"

---

### Issue: "Connection failed" when clicking Connect to Team

**Cause:** Apps Script doesn't support JSONP or GET requests

**Fix:**
1. Verify you copied the COMPLETE script from Step 2
2. Check the `doGet` function includes JSONP support (callback parameter)
3. Redeploy the Apps Script

---

### Issue: Data appears in sheet but with wrong format

**Cause:** Headers don't match exactly

**Fix:**
1. Double-check headers in Step 1
2. Ensure no extra spaces or typos
3. Headers must be in Row 1

---

### Issue: "Sheet not found" errors in Apps Script logs

**Cause:** Sheet tab names don't match

**Fix:**
1. Tabs must be named exactly: **Timesheets**, **Staff**, **Clients**
2. Check capitalization (T, S, C must be capital)
3. No extra spaces in names

---

### Issue: Sync works from one device but not another

**Cause:** Webhook URL not saved in new device

**Fix:**
1. On new device, use "Connect to Team" feature
2. Enter webhook URL
3. This will save it to that browser's localStorage

---

## Verify Your Setup Checklist

- [ ] Google Sheet has 3 tabs: Timesheets, Staff, Clients
- [ ] Each tab has correct headers in Row 1
- [ ] Apps Script code is pasted completely (all 200+ lines)
- [ ] Apps Script is DEPLOYED as Web app
- [ ] Deployment "Who has access" is set to "Anyone"
- [ ] Webhook URL is copied (ends with /exec)
- [ ] Webhook URL is saved in MIST Portal Settings
- [ ] Test entry appears in Google Sheet within 3 seconds
- [ ] Can load data from new browser using "Connect to Team"

---

## Testing the Complete Workflow

### Scenario 1: Adding a Timesheet Entry

1. Log in as Staff member
2. Go to Shift Logs
3. Add entry with all details
4. Watch header for "Syncing..." → "Synced"
5. Refresh Google Sheet - entry appears

### Scenario 2: Loading on New Device

1. Open new/incognito browser
2. Click "Connect to Team"
3. Enter webhook URL
4. See "Loading Team Data..."
5. After reload, data is present
6. Can log in and see all data

### Scenario 3: Two-Way Sync

1. Add data from Device A
2. Wait 3 seconds for sync
3. On Device B, refresh app
4. Device B should auto-sync and show new data

---

## Advanced Debugging

### Check Apps Script Logs

1. In Apps Script, click **Executions** (clock icon on left)
2. Look for recent executions when you tried to sync
3. Click on execution to see logs
4. Look for errors or "Sheet not found" messages

### Check Browser Console

1. Press F12 in MIST Portal
2. Go to Console tab
3. Try syncing
4. Look for errors like:
   - "CORS error" - Apps Script not configured properly
   - "404 Not Found" - Wrong webhook URL
   - "Script load failed" - JSONP not supported

### Manual Test of Apps Script

1. Get your webhook URL
2. Open in browser: `YOUR_URL?callback=test`
3. You should see: `test({success:true, timesheets:[...], ...})`
4. If you see this, JSONP is working!

---

## Contact Support

If sync still doesn't work after following this guide:

1. Export backup from Settings → Download Backup
2. Check Apps Script Executions for error messages
3. Check browser console for errors
4. Share error messages for troubleshooting

**Remember:** The webhook URL is the key to everything. Without it configured correctly, nothing will sync!
