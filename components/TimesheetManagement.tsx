
import React, { useState, useMemo } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { SERVICE_TYPES, SHIFT_TYPES } from '../constants';
import { exportToCSV } from '../utils/csvExport';
import { syncService } from '../services/sync';
import { Plus, Filter, FileSpreadsheet, Calendar, MapPin, ChevronRight, X, Trash2, CheckCircle, XCircle, Cloud, Send, Edit3, Save } from 'lucide-react';

interface TimesheetManagementProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
  onUpdate: (entries: TimesheetEntry[]) => void;
}

const TimesheetManagement: React.FC<TimesheetManagementProps> = ({ user, entries, clients, staff, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filters, setFilters] = useState({ client: '', staff: '', from: '', to: '', status: '' });

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
    location: 'Community'
  });

  // Time conversion helpers for AM/PM format
  const formatTimeForDisplay = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return { hours: hours12.toString().padStart(2, '0'), minutes: minutes.toString().padStart(2, '0'), period };
  };

  const formatTimeTo24 = (hours: string, minutes: string, period: string) => {
    let h = parseInt(hours);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
  };

  const calculateHours = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let startMin = sH * 60 + sM;
    let endMin = eH * 60 + eM;
    if (endMin < startMin) endMin += 24 * 60;
    return (endMin - startMin) / 60;
  };

  const getHourlyRate = (client: Client, shift: string, dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    // Sleepover has a flat rate regardless of day
    if (shift === 'sleepover') return client.rates.sleepover || 250;
    if (day === 0) return client.rates.sunday;
    if (day === 6) return client.rates.saturday;
    if (shift === 'night') return client.rates.night;
    if (shift === 'evening') return client.rates.evening;
    return client.rates.day;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newEntry.clientId);
    const staffMember = staff.find(s => s.id === (newEntry.staffId || user.id));
    if (!client || !staffMember) return;

    const hours = calculateHours(newEntry.startTime!, newEntry.endTime!);
    const rate = getHourlyRate(client, newEntry.shiftType!, newEntry.date!);
    const workEarnings = hours * rate;
    const travelEarnings = (newEntry.km || 0) * client.rates.km;

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
      location: 'Community'
    });
  };

  const handleEditSave = () => {
    if (!editingEntry) return;
    const client = clients.find(c => c.id === editingEntry.clientId);
    if (!client) return;

    const hours = calculateHours(editingEntry.startTime, editingEntry.endTime);
    const rate = getHourlyRate(client, editingEntry.shiftType, editingEntry.date);
    const workEarnings = hours * rate;
    const travelEarnings = editingEntry.km * client.rates.km;

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
      alert("Cloud Webhook not configured in Portal Settings.");
      return;
    }

    setIsSyncing(true);
    try {
      await syncService.syncToGoogleSheets(webhookUrl, filtered);
      const updated = entries.map(e => ({ ...e, syncedToCloud: true }));
      onUpdate(updated);
      alert("MIST Cloud Sync Successful.");
    } catch (err) {
      alert("Sync failed. Check settings.");
    } finally {
      setIsSyncing(false);
    }
  };

  const canEdit = (entry: TimesheetEntry) => {
    // Manager can edit any pending entry, staff can edit their own pending entries
    if (entry.status !== 'pending') return false;
    if (user.role === UserRole.MANAGER) return true;
    return entry.staffId === user.id;
  };

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchRole = user.role === UserRole.MANAGER || e.staffId === user.id;
      return matchRole;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, user]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full sm:w-auto">
          <button
            onClick={handleCloudSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${isSyncing ? 'bg-slate-100' : 'bg-mistTeal/10 text-mistTeal hover:bg-mistTeal hover:text-white'}`}
          >
            <Cloud size={16} /> Sync to Central Database
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

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 p-8 lg:p-10 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-mistNavy dark:text-white">
            <Calendar className="text-mistTeal" /> Support Worker Shift Log
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-sm text-mistNavy dark:text-white">{entry.date}</span>
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
                      {entry.hours.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{entry.km.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center font-black text-success">${entry.totalEarnings.toFixed(2)}</td>
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
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black">Edit Shift Entry</h3>
              <button onClick={() => setEditingEntry(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                    value={editingEntry.hours}
                    onChange={e => setEditingEntry({ ...editingEntry, hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">KMs</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-bold"
                    value={editingEntry.km}
                    onChange={e => setEditingEntry({ ...editingEntry, km: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Notes</label>
                <textarea
                  rows={4}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-mistTeal outline-none font-medium resize-none"
                  value={editingEntry.notes}
                  onChange={e => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setEditingEntry(null)} className="px-6 py-3 text-slate-500 font-bold">Cancel</button>
                <button onClick={handleEditSave} className="px-8 py-3 bg-mistNavy text-white rounded-xl font-black flex items-center gap-2">
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
