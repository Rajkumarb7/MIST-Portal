
import React, { useState, useMemo } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { SERVICE_TYPES, SHIFT_TYPES } from '../constants';
import { exportToCSV } from '../utils/csvExport';
import { syncService } from '../services/sync';
import { Plus, Filter, FileSpreadsheet, Calendar, MapPin, ChevronRight, X, Trash2, CheckCircle, XCircle, Cloud, Send } from 'lucide-react';

interface TimesheetManagementProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
  onUpdate: (entries: TimesheetEntry[]) => void;
}

const TimesheetManagement: React.FC<TimesheetManagementProps> = ({ user, entries, clients, staff, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filters, setFilters] = useState({ client: '', staff: '', from: '', to: '', status: '' });
  
  const [newEntry, setNewEntry] = useState<Partial<TimesheetEntry>>({
    date: new Date().toISOString().split('T')[0],
    staffId: user.role === UserRole.STAFF ? user.id : '',
    clientId: '',
    serviceType: SERVICE_TYPES[0].id,
    shiftType: 'day',
    startTime: '09:00',
    endTime: '17:00',
    km: 0,
    notes: '',
    location: 'Community'
  });

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

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchRole = user.role === UserRole.MANAGER || e.staffId === user.id;
      return matchRole;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, user]);

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
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-mistNavy dark:text-white">
            <Calendar className="text-mistTeal" /> Support Worker Shift Log
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
              <input type="date" required className="form-input-v3" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Portfolio</label>
              <select required className="form-input-v3" value={newEntry.clientId} onChange={e => setNewEntry({...newEntry, clientId: e.target.value})}>
                <option value="">Select NDIS Client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {user.role === UserRole.MANAGER && (
               <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker</label>
                <select required className="form-input-v3" value={newEntry.staffId} onChange={e => setNewEntry({...newEntry, staffId: e.target.value})}>
                  <option value="">Choose worker...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
              <select className="form-input-v3" value={newEntry.serviceType} onChange={e => setNewEntry({...newEntry, serviceType: e.target.value})}>
                {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start</label>
                <input type="time" required className="form-input-v3" value={newEntry.startTime} onChange={e => setNewEntry({...newEntry, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End</label>
                <input type="time" required className="form-input-v3" value={newEntry.endTime} onChange={e => setNewEntry({...newEntry, endTime: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel (KM)</label>
              <input type="number" step="0.1" className="form-input-v3" value={newEntry.km} onChange={e => setNewEntry({...newEntry, km: parseFloat(e.target.value)})} />
            </div>

            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Highlights / Notes</label>
              <textarea className="form-input-v3 h-24 pt-4" placeholder="How was the session?" value={newEntry.notes} onChange={e => setNewEntry({...newEntry, notes: e.target.value})} />
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end gap-4">
            <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 text-slate-500 font-bold">Cancel</button>
            <button type="submit" className="px-12 py-4 bg-mistNavy text-white rounded-2xl font-black shadow-2xl">Verify & Submit</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Verified Date</th>
                <th className="px-8 py-5">Client</th>
                {user.role === UserRole.MANAGER && <th className="px-8 py-5">Worker</th>}
                <th className="px-8 py-5">Hours</th>
                <th className="px-8 py-5 text-center">Total</th>
                <th className="px-8 py-5">Sync</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5">
                    <span className="font-bold text-sm text-mistNavy dark:text-white block">{entry.date}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-sm text-mistNavy dark:text-white">{entry.clientName}</span>
                  </td>
                  {user.role === UserRole.MANAGER && (
                    <td className="px-8 py-5 text-sm font-semibold">{entry.staffName}</td>
                  )}
                  <td className="px-8 py-5">
                    <span className="inline-block px-3 py-1 bg-mistNavy/10 text-mistNavy rounded-lg text-xs font-black">
                      {entry.hours.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center font-black text-success">${entry.totalEarnings.toFixed(2)}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${entry.syncedToCloud ? 'bg-success' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{entry.syncedToCloud ? 'OK' : 'WAIT'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => onUpdate(entries.filter(e => e.id !== entry.id))} className="p-3 text-slate-300 hover:text-danger"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimesheetManagement;
