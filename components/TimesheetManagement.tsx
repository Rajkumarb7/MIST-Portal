
import React, { useState, useMemo } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { SERVICE_TYPES, SHIFT_TYPES } from '../constants';
import { exportToCSV } from '../utils/csvExport';
import { syncService } from '../services/sync';
import { storage } from '../services/storage';
import { Plus, Filter, FileSpreadsheet, Calendar, MapPin, ChevronRight, X, Trash2, CheckCircle, XCircle, Cloud, CloudDownload, Send, Edit3, Save, ChevronDown, RefreshCw } from 'lucide-react';

interface TimesheetManagementProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
  onUpdate: (entries: TimesheetEntry[]) => void;
  onUpdateStaff?: (staff: Staff[]) => void;
  onUpdateClients?: (clients: Client[]) => void;
}

const TimesheetManagement: React.FC<TimesheetManagementProps> = ({ user, entries, clients, staff, onUpdate, onUpdateStaff, onUpdateClients }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');

  // Helper to get fortnight dates
  const getFortnightDates = (weeksBack: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1;
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - daysToLastMonday - (weeksBack * 14));
    lastMonday.setHours(0, 0, 0, 0);
    const fortnightEnd = new Date(lastMonday);
    fortnightEnd.setDate(lastMonday.getDate() + 13);
    fortnightEnd.setHours(23, 59, 59, 999);
    return { start: lastMonday, end: fortnightEnd };
  };

  // Get date range based on filter selection
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return { start: weekAgo, end: now };
      case 'fortnight':
        return getFortnightDates(0);
      case 'lastFortnight':
        return getFortnightDates(1);
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return { start: monthAgo, end: now };
      case 'quarter':
        const quarterAgo = new Date(now);
        quarterAgo.setDate(now.getDate() - 90);
        return { start: quarterAgo, end: now };
      case 'custom':
        return {
          start: customFromDate ? new Date(customFromDate) : new Date(0),
          end: customToDate ? new Date(customToDate + 'T23:59:59') : now
        };
      default:
        return { start: new Date(0), end: now };
    }
  };

  const [newEntry, setNewEntry] = useState<Partial<TimesheetEntry>>({
    date: new Date().toISOString().split('T')[0],
    staffId: user.role === UserRole.STAFF ? user.id : '',
    clientId: '',
    serviceType: SERVICE_TYPES[0]?.id || '',
    shiftType: 'day',
    startTime: '09:00',
    endTime: '17:00',
    km: 0,
    notes: '',
    location: 'Community',
    isPublicHoliday: false
  });

  // Time conversion helpers for AM/PM format
  const formatTimeForDisplay = (time24: string) => {
    if (!time24 || !time24.includes(':')) return { hours: '09', minutes: '00', period: 'AM' };
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return { hours: '09', minutes: '00', period: 'AM' };
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return { hours: hours12.toString().padStart(2, '0'), minutes: m.toString().padStart(2, '0'), period };
  };

  const formatTimeTo24 = (hours: string, minutes: string, period: string) => {
    let h = parseInt(hours) || 0;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes || '00'}`;
  };

  const calculateHours = (start: string, end: string) => {
    if (!start || !end || !start.includes(':') || !end.includes(':')) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
    let startMin = sH * 60 + sM;
    let endMin = eH * 60 + eM;
    if (endMin < startMin) endMin += 24 * 60;
    return (endMin - startMin) / 60;
  };

  // Get hourly rate from STAFF (not client) based on shift type, day, and public holiday status
  const getHourlyRate = (staffMember: Staff, shift: string, dateStr: string, isPublicHoliday?: boolean) => {
    const rates = staffMember.rates;
    if (!rates) return 65; // Default fallback

    const date = new Date(dateStr);
    const day = date.getDay();

    // Sleepover is a flat overnight rate — not affected by public holiday multiplier
    if (shift === 'sleepover') return rates.sleepover || 250;

    // Determine the base rate for this day/shift combination
    let baseRate: number;
    if (day === 0) baseRate = rates.sunday || 125;
    else if (day === 6) baseRate = rates.saturday || 95;
    else if (shift === 'night') baseRate = rates.night || 85;
    else if (shift === 'evening') baseRate = rates.evening || 72;
    else baseRate = rates.day || 65;

    // Public Holiday = 2× the applicable base rate for that day/shift
    return isPublicHoliday ? baseRate * 2 : baseRate;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate client selection
    if (!newEntry.clientId) {
      alert('Please select a client from the dropdown');
      return;
    }

    const client = clients.find(c => c.id === newEntry.clientId);
    if (!client) {
      alert('Selected client not found. Please refresh and try again.');
      return;
    }

    // Validate staff selection
    const staffId = newEntry.staffId || user.id;
    if (user.role === UserRole.MANAGER && !newEntry.staffId) {
      alert('Please select a worker from the dropdown');
      return;
    }

    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) {
      alert('Selected worker not found. Please refresh and try again.');
      return;
    }

    const hours = calculateHours(newEntry.startTime!, newEntry.endTime!);
    // Use STAFF rates (not client rates), check for public holiday
    const rate = getHourlyRate(staffMember, newEntry.shiftType!, newEntry.date!, newEntry.isPublicHoliday);
    const workEarnings = hours * rate;
    const kmRate = staffMember.rates?.km || 0.96;
    const travelEarnings = (newEntry.km || 0) * kmRate;

    const entry: TimesheetEntry = {
      ...newEntry as TimesheetEntry,
      id: Date.now().toString(),
      staffName: staffMember.name,
      clientName: client.name,
      hours,
      workEarnings,
      travelEarnings,
      totalEarnings: workEarnings + travelEarnings,
      status: 'pending',
      syncedToCloud: false
    };

    onUpdate([...entries, entry]);
    setIsAdding(false);
    // Reset form
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      staffId: user.role === UserRole.STAFF ? user.id : '',
      clientId: '',
      serviceType: SERVICE_TYPES[0]?.id || '',
      shiftType: 'day',
      startTime: '09:00',
      endTime: '17:00',
      km: 0,
      notes: '',
      location: 'Community',
      isPublicHoliday: false
    });
  };

  const handleEditSave = () => {
    if (!editingEntry) return;
    const staffMember = staff.find(s => s.id === editingEntry.staffId);
    if (!staffMember) return;

    const hours = calculateHours(editingEntry.startTime, editingEntry.endTime);
    // Use STAFF rates (not client rates), check for public holiday
    const rate = getHourlyRate(staffMember, editingEntry.shiftType, editingEntry.date, editingEntry.isPublicHoliday);
    const workEarnings = hours * rate;
    const kmRate = staffMember.rates?.km || 0.96;
    const travelEarnings = editingEntry.km * kmRate;

    const updated = entries.map(e => e.id === editingEntry.id ? {
      ...editingEntry,
      hours,
      workEarnings,
      travelEarnings,
      totalEarnings: workEarnings + travelEarnings
    } : e);
    onUpdate(updated);
    setEditingEntry(null);
  };

  const handleCloudSync = async () => {
    const webhookUrl = localStorage.getItem('mist_webhook_url');
    if (!webhookUrl) {
      alert("Cloud Webhook not configured. Use 'Connect to Team' on the login screen first.");
      return;
    }

    setIsSyncing(true);
    try {
      // Get all data from localStorage for full sync
      const allStaff = JSON.parse(localStorage.getItem('timesheet_staff_v3') || '[]');
      const allClients = JSON.parse(localStorage.getItem('timesheet_clients_v3') || '[]');

      await syncService.syncAllData(webhookUrl, {
        timesheets: entries,
        staff: allStaff,
        clients: allClients
      });
      const updated = entries.map(e => ({ ...e, syncedToCloud: true }));
      onUpdate(updated);
      alert("MIST Cloud Sync Successful! Data uploaded to Google Sheets.");
    } catch (err) {
      alert("Sync failed. Check settings.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Load data from Google Sheets (Pull from Cloud)
  const handleLoadFromCloud = async () => {
    const webhookUrl = localStorage.getItem('mist_webhook_url');
    if (!webhookUrl) {
      alert("Cloud Webhook not configured. Use 'Connect to Team' on the login screen first.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await syncService.loadFromCloud(webhookUrl);
      if (!data) {
        alert("No data found in cloud. Check your webhook URL.");
        return;
      }

      let messages: string[] = [];

      // --- Load Staff from cloud ---
      if (data.staff && data.staff.length > 0) {
        // Build a map of existing local staff so we can protect custom rates
        const existingStaffMap = new Map(storage.getStaff().map(s => [s.id, s]));

        const loadedStaff: Staff[] = data.staff.map((s: any) => {
          const id = String(s.id ?? s.ID ?? '');
          const cloudRates = {
            day:          Number(s.dayrate || s.day || s.DayRate) || 65,
            evening:      Number(s.eveningrate || s.evening || s.EveningRate) || 72,
            night:        Number(s.nightrate || s.night || s.NightRate) || 85,
            sleepover:    Number(s.sleepoverrate || s.sleepover || s.SleepoverRate) || 250,
            saturday:     Number(s.saturdayrate || s.saturday || s.SaturdayRate) || 95,
            sunday:       Number(s.sundayrate || s.sunday || s.SundayRate) || 125,
            publicHoliday:Number(s.holidayrate || s.publicholiday || s.PublicHolidayRate) || 160,
            km:           Number(s.kmrate || s.km || s.KMRate) || 0.96
          };
          // If all rates came back as exactly the defaults, the sheet likely has no rate
          // headers yet (pre-v3.2 Apps Script). Preserve the locally saved custom rates.
          const allDefaults =
            cloudRates.day === 65 && cloudRates.evening === 72 && cloudRates.night === 85 &&
            cloudRates.sleepover === 250 && cloudRates.saturday === 95 &&
            cloudRates.sunday === 125 && cloudRates.publicHoliday === 160 && cloudRates.km === 0.96;
          const local = existingStaffMap.get(id);
          const rates = (allDefaults && local?.rates) ? local.rates : cloudRates;

          return {
            id,
            name: s.name || s.Name,
            role: s.role || s.Role || 'Support Worker',
            email: s.email || s.Email || '',
            phone: s.phone || s.Phone || '',
            startDate: s.startdate || s.startDate || s.StartDate || '',
            active: s.active === 'Yes' || s.active === true || s.Active === 'Yes',
            rates
          };
        });
        storage.saveStaff(loadedStaff);
        if (onUpdateStaff) onUpdateStaff(loadedStaff);
        messages.push(`${loadedStaff.length} staff`);
      }

      // --- Load Clients from cloud ---
      if (data.clients && data.clients.length > 0) {
        const loadedClients: Client[] = data.clients.map((c: any) => ({
          // Coerce to string — Google Sheets returns numeric IDs as JS numbers
          id: String(c.id ?? c.ID ?? ''),
          name: String(c.name || c.Name || '')
        })).filter((c: Client) => c.id && c.name);
        storage.saveClients(loadedClients);
        if (onUpdateClients) onUpdateClients(loadedClients);
        messages.push(`${loadedClients.length} clients`);
      }

      // --- Load Timesheets from cloud ---
      // Use updated staff list for rate calculation (from cloud or current local)
      const currentStaff: Staff[] = data.staff && data.staff.length > 0
        ? storage.getStaff()
        : staff;

      if (data.timesheets && data.timesheets.length > 0) {
        // For staff: only load their own entries; for manager: load all
        let loadedEntries = data.timesheets;
        if (user.role === UserRole.STAFF) {
          loadedEntries = loadedEntries.filter((e: any) => e.staffid === user.id || e.staffId === user.id || e.StaffID === user.id);
        }

        // Transform and recalculate earnings using staff rates.
        // readSheet() returns ALL headers as lowercase (e.g. "staffName" → "staffname"),
        // so every multi-word field needs BOTH the lowercase AND camelCase fallback.
        const transformedEntries: TimesheetEntry[] = loadedEntries.map((e: any) => {
          // IDs — lowercase keys from readSheet take priority
          const staffId  = String(e.staffid  ?? e.staffId  ?? e.StaffID  ?? '');
          const clientId = String(e.clientid ?? e.clientId ?? e.ClientID ?? '');

          const staffMember = currentStaff.find(s => s.id === staffId);
          const hours = Number(e.hours || e.Hours || 0);
          const km    = Number(e.km    || e.KM    || 0);

          // Normalize date
          const rawDate = String(e.date || e.Date || '');
          const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);

          // Shift type & holiday — lowercase first
          const shiftType = e.shifttype || e.shiftType || e.ShiftType || 'day';
          const isPublicHoliday =
            e.ispublicholiday === true || e.ispublicholiday === 'Yes' ||
            e.isPublicHoliday === true || e.isPublicHoliday === 'Yes' ||
            e.IsPublicHoliday === 'Yes';

          // Earnings — lowercase keys from readSheet
          let workEarnings   = Number(e.workearnings   ?? e.workEarnings   ?? e.WorkEarnings   ?? 0);
          let travelEarnings = Number(e.travelearnings ?? e.travelEarnings ?? e.TravelEarnings ?? 0);

          // Recalculate if zero (missing or not yet computed)
          if (workEarnings === 0 && hours > 0 && staffMember?.rates) {
            const rate = getHourlyRate(staffMember, shiftType, date, isPublicHoliday);
            workEarnings = hours * rate;
          }
          if (travelEarnings === 0 && km > 0 && staffMember?.rates) {
            travelEarnings = km * (staffMember.rates.km || 0.96);
          }

          return {
            id: String(e.id ?? e.ID ?? Date.now()),
            date,
            staffId,
            staffName:   e.staffname   || e.staffName   || e.StaffName   || staffMember?.name || '',
            clientId,
            clientName:  e.clientname  || e.clientName  || e.ClientName  || '',
            serviceType: e.servicetype || e.serviceType || e.ServiceType || '',
            shiftType: shiftType as 'day' | 'evening' | 'night' | 'sleepover',
            location:  e.location  || e.Location  || 'Community',
            startTime: e.starttime || e.startTime || e.StartTime || '09:00',
            endTime:   e.endtime   || e.endTime   || e.EndTime   || '17:00',
            hours,
            km,
            workEarnings,
            travelEarnings,
            totalEarnings: workEarnings + travelEarnings,
            isPublicHoliday,
            notes:  e.notes  || e.Notes  || '',
            status: (e.status || e.Status || 'pending') as 'pending' | 'approved' | 'rejected',
            syncedToCloud: true
          };
        });

        // Strip blank rows (empty date = blank Google Sheets row)
        const validEntries = transformedEntries.filter(e => {
          if (!e.date || e.date.length < 8) return false;
          if (isNaN(new Date(e.date).getTime())) return false;
          if (!e.id) return false;
          return true;
        });

        // Cloud is the source of truth — replace any local entry that exists in the
        // cloud with the cloud version, and drop local entries that are no longer in
        // the cloud (e.g. blank rows that were deleted from the sheet).
        // Local-only entries (not yet pushed) are preserved.
        const cloudIds = new Set(validEntries.map(e => e.id));
        const localOnlyEntries = entries.filter(e => !cloudIds.has(e.id));
        const merged = [...validEntries, ...localOnlyEntries];

        onUpdate(merged);
        messages.push(`${validEntries.length} timesheet entries from cloud`);
      }

      if (messages.length > 0) {
        alert(`Cloud sync complete! Loaded: ${messages.join(', ')}.`);
      } else {
        alert("No data found in cloud.");
      }
    } catch (err) {
      console.error('Load from cloud error:', err);
      alert("Failed to load from cloud. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = (entry: TimesheetEntry) => {
    // Manager can edit any pending entry, staff can edit their own pending entries
    if (entry.status !== 'pending') return false;
    if (user.role === UserRole.MANAGER) return true;
    return entry.staffId === user.id;
  };

  const filtered = useMemo(() => {
    const { start, end } = getDateRange();
    return entries.filter(e => {
      // Role-based filter
      const matchRole = user.role === UserRole.MANAGER || e.staffId === user.id;
      if (!matchRole) return false;

      // Date filter
      const entryDate = new Date(e.date);
      if (entryDate < start || entryDate > end) return false;

      // Status filter
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;

      // Client filter — match by clientId (primary) OR by clientName (fallback for entries
      // whose clientId got out of sync with the current client list after a re-sync).
      if (clientFilter) {
        const selectedClient = clients.find(c => c.id === clientFilter);
        const matchesById   = e.clientId === clientFilter;
        const matchesByName = selectedClient != null && e.clientName === selectedClient.name;
        if (!matchesById && !matchesByName) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, clients, user, dateFilter, customFromDate, customToDate, statusFilter, clientFilter]);

  // Time input component for better UX
  const TimeInput = ({ value, onChange, label }: { value: string; onChange: (val: string) => void; label: string }) => {
    const { hours, minutes, period } = formatTimeForDisplay(value);
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-2">
          <select
            className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
            value={hours}
            onChange={e => onChange(formatTimeTo24(e.target.value, minutes, period))}
          >
            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
            value={minutes}
            onChange={e => onChange(formatTimeTo24(hours, e.target.value, period))}
          >
            {['00', '15', '30', '45'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="w-20 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
            value={period}
            onChange={e => onChange(formatTimeTo24(hours, minutes, e.target.value))}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    );
  };

  // Calculate summary stats for filtered entries
  const summary = useMemo(() => {
    return {
      totalEntries: filtered.length,
      totalHours: filtered.reduce((sum, e) => sum + (Number(e.hours) || 0), 0),
      totalEarnings: filtered.reduce((sum, e) => sum + (Number(e.totalEarnings) || 0), 0),
      pending: filtered.filter(e => e.status === 'pending').length,
      approved: filtered.filter(e => e.status === 'approved').length
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${showFilters ? 'bg-mistNavy text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <Filter size={16} /> Filters
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleLoadFromCloud}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${isLoading ? 'bg-slate-100 dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40'}`}
          >
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
            {isLoading ? 'Loading...' : 'Pull'}
          </button>
          <button
            onClick={handleCloudSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${isSyncing ? 'bg-slate-100 dark:bg-slate-800' : 'bg-mistTeal/10 text-mistTeal hover:bg-mistTeal hover:text-white'}`}
          >
            {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
            {isSyncing ? 'Syncing...' : 'Push'}
          </button>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full sm:w-auto px-8 py-3 bg-mistNavy text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-mistNavy/20"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          {isAdding ? 'Close Form' : 'Log New Shift'}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Date Range</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none font-bold text-sm"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 Days</option>
                <option value="fortnight">Current Fortnight</option>
                <option value="lastFortnight">Last Fortnight</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div className="min-w-[150px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">From</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none font-bold text-sm"
                    value={customFromDate}
                    onChange={e => setCustomFromDate(e.target.value)}
                  />
                </div>
                <div className="min-w-[150px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">To</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none font-bold text-sm"
                    value={customToDate}
                    onChange={e => setCustomToDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="min-w-[150px]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Client</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none font-bold text-sm"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              >
                <option value="">All Clients</option>
                {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</label>
              <select
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none font-bold text-sm"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={() => { setDateFilter('all'); setStatusFilter('all'); setClientFilter(''); setCustomFromDate(''); setCustomToDate(''); }}
              className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-mistTeal transition-colors"
            >
              Clear Filters
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-2xl font-black text-mistNavy dark:text-white">{summary.totalEntries}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-mistNavy dark:text-white">{summary.totalHours.toFixed(1)}h</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-success">${summary.totalEarnings.toFixed(2)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-warning">{summary.pending}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 p-4 sm:p-8 lg:p-10 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8 flex items-center gap-3 text-mistNavy dark:text-white">
            <Calendar className="text-mistTeal" size={20} /> Support Worker Shift Log
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
              <input
                type="date"
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                value={newEntry.date}
                onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
              />
              {newEntry.date && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-mistTeal">
                    {new Date(newEntry.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long' })}
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEntry.isPublicHoliday || false}
                      onChange={e => setNewEntry({ ...newEntry, isPublicHoliday: e.target.checked })}
                      className="w-4 h-4 rounded border-2 border-mistTeal text-mistTeal focus:ring-mistTeal focus:ring-2"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Public Holiday</span>
                  </label>
                </div>
              )}
            </div>

            {/* Client */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Portfolio</label>
              <select
                required
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                value={newEntry.clientId}
                onChange={e => setNewEntry({ ...newEntry, clientId: e.target.value })}
              >
                <option value="">Select NDIS Client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Worker (Manager only) */}
            {user.role === UserRole.MANAGER && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker</label>
                <select
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                  value={newEntry.staffId}
                  onChange={e => setNewEntry({ ...newEntry, staffId: e.target.value })}
                >
                  <option value="">Choose worker...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
              <select
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                value={newEntry.serviceType}
                onChange={e => setNewEntry({ ...newEntry, serviceType: e.target.value })}
              >
                {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </div>

            {/* Shift Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Type</label>
              <select
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                value={newEntry.shiftType}
                onChange={e => {
                  const shiftType = e.target.value as 'day' | 'evening' | 'night' | 'sleepover';
                  // Auto-set times for sleepover (11 PM - 7 AM)
                  if (shiftType === 'sleepover') {
                    setNewEntry({ ...newEntry, shiftType, startTime: '23:00', endTime: '07:00' });
                  } else {
                    setNewEntry({ ...newEntry, shiftType });
                  }
                }}
              >
                {SHIFT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </div>

            {/* Travel KM */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel (KM)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                value={newEntry.km}
                onChange={e => setNewEntry({ ...newEntry, km: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Time inputs - full width row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <TimeInput
              label="Start Time"
              value={newEntry.startTime || '09:00'}
              onChange={val => setNewEntry({ ...newEntry, startTime: val })}
            />
            <TimeInput
              label="End Time"
              value={newEntry.endTime || '17:00'}
              onChange={val => setNewEntry({ ...newEntry, endTime: val })}
            />
          </div>

          {/* Notes - bigger text area */}
          <div className="mt-6 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Highlights / Notes</label>
            <textarea
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-medium resize-none"
              rows={5}
              placeholder="How was the session? Enter detailed notes about the shift, activities completed, any incidents or observations..."
              value={newEntry.notes}
              onChange={e => setNewEntry({ ...newEntry, notes: e.target.value })}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-4">
            <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
            <button type="submit" className="px-12 py-4 bg-mistNavy text-white rounded-xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Verify & Submit</button>
          </div>
        </form>
      )}

      {/* Entries Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Client</th>
                {user.role === UserRole.MANAGER && <th className="px-6 py-5">Worker</th>}
                <th className="px-6 py-5">Service</th>
                <th className="px-6 py-5">Hours</th>
                <th className="px-6 py-5">KMs</th>
                <th className="px-6 py-5 text-center">Total</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody key={`${clientFilter}-${statusFilter}-${dateFilter}-${customFromDate}-${customToDate}-${filtered.length}`} className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm text-mistNavy dark:text-white">{entry.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-mistTeal font-semibold">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                        </span>
                        {entry.isPublicHoliday && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-black uppercase">PH</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-sm text-mistNavy dark:text-white">{entry.clientName}</span>
                  </td>
                  {user.role === UserRole.MANAGER && (
                    <td className="px-6 py-4 text-sm font-semibold">{entry.staffName}</td>
                  )}
                  <td className="px-6 py-4 text-xs text-slate-500">{SERVICE_TYPES.find(s => s.id === entry.serviceType)?.name || entry.serviceType}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 bg-mistNavy/10 dark:bg-mistNavy/30 text-mistNavy dark:text-white rounded-lg text-xs font-black">
                      {(Number(entry.hours) || 0).toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{(Number(entry.km) || 0).toFixed(1)}</td>
                  <td className="px-6 py-4 text-center font-black text-success">${(Number(entry.totalEarnings) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      entry.status === 'approved' ? 'bg-success/10 text-success' :
                      entry.status === 'rejected' ? 'bg-danger/10 text-danger' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {entry.status === 'approved' && <CheckCircle size={12} />}
                      {entry.status === 'rejected' && <XCircle size={12} />}
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit(entry) && (
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-2 text-slate-400 hover:text-mistTeal hover:bg-mistTeal/10 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this entry?')) {
                            onUpdate(entries.filter(e => e.id !== entry.id));
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No shift logs found. Click "Log New Shift" to add your first entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mistNavy/40 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-lg font-black flex items-center gap-2 text-mistNavy dark:text-white">
                <Edit3 size={18} className="text-mistTeal" /> Edit Shift Entry
              </h3>
              <button onClick={() => setEditingEntry(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">

              {/* Row 1: Date + Public Holiday */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                <input
                  type="date"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                  value={editingEntry.date}
                  onChange={e => setEditingEntry({ ...editingEntry, date: e.target.value })}
                />
                {editingEntry.date && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-mistTeal">
                      {new Date(editingEntry.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingEntry.isPublicHoliday || false}
                        onChange={e => setEditingEntry({ ...editingEntry, isPublicHoliday: e.target.checked })}
                        className="w-4 h-4 rounded border-2 border-mistTeal text-mistTeal focus:ring-mistTeal focus:ring-2"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Public Holiday</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Row 2: Client + Staff (manager only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NDIS Client</label>
                  <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                    value={editingEntry.clientId}
                    onChange={e => setEditingEntry({ ...editingEntry, clientId: e.target.value })}
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {user.role === UserRole.MANAGER && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker</label>
                    <select
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                      value={editingEntry.staffId}
                      onChange={e => setEditingEntry({ ...editingEntry, staffId: e.target.value })}
                    >
                      <option value="">Choose worker...</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 3: Service Type + Shift Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
                  <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                    value={editingEntry.serviceType}
                    onChange={e => setEditingEntry({ ...editingEntry, serviceType: e.target.value })}
                  >
                    {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Type</label>
                  <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold appearance-none"
                    value={editingEntry.shiftType}
                    onChange={e => {
                      const shiftType = e.target.value as 'day' | 'evening' | 'night' | 'sleepover';
                      if (shiftType === 'sleepover') {
                        setEditingEntry({ ...editingEntry, shiftType, startTime: '23:00', endTime: '07:00' });
                      } else {
                        setEditingEntry({ ...editingEntry, shiftType });
                      }
                    }}
                  >
                    {SHIFT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 4: Start Time + End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TimeInput
                  label="Start Time"
                  value={editingEntry.startTime || '09:00'}
                  onChange={val => setEditingEntry({ ...editingEntry, startTime: val })}
                />
                <TimeInput
                  label="End Time"
                  value={editingEntry.endTime || '17:00'}
                  onChange={val => setEditingEntry({ ...editingEntry, endTime: val })}
                />
              </div>

              {/* Row 5: KM */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                  value={editingEntry.km}
                  onChange={e => setEditingEntry({ ...editingEntry, km: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Row 6: Notes */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Notes</label>
                <textarea
                  rows={3}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-medium resize-none"
                  value={editingEntry.notes}
                  onChange={e => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                />
              </div>

              {/* Hours preview */}
              {editingEntry.startTime && editingEntry.endTime && (
                <div className="p-4 bg-mistTeal/10 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-black text-mistTeal uppercase tracking-widest">Calculated Hours</span>
                  <span className="text-lg font-black text-mistNavy dark:text-white">
                    {calculateHours(editingEntry.startTime, editingEntry.endTime).toFixed(2)} hrs
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-2">
                <button onClick={() => setEditingEntry(null)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                <button onClick={handleEditSave} className="px-8 py-3 bg-mistNavy text-white rounded-xl font-black flex items-center gap-2 hover:bg-mistNavy/90 transition-all">
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetManagement;
