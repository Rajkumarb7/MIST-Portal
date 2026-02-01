
import React, { useMemo } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Clock, TrendingUp, DollarSign, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
  onUpdateEntries: (entries: TimesheetEntry[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, entries, clients, staff, onUpdateEntries }) => {
  const filteredEntries = useMemo(() => {
    if (user.role === UserRole.MANAGER) return entries;
    if (user.role === UserRole.STAFF) return entries.filter(e => e.staffId === user.id);
    if (user.role === UserRole.CLIENT) return entries.filter(e => e.clientId === user.id);
    return [];
  }, [user, entries]);

  const stats = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    const totalEarnings = filteredEntries.reduce((sum, e) => sum + e.totalEarnings, 0);
    const totalKM = filteredEntries.reduce((sum, e) => sum + e.km, 0);
    const pendingCount = filteredEntries.filter(e => e.status === 'pending').length;

    return { totalHours, totalEarnings, totalKM, pendingCount };
  }, [filteredEntries]);

  const pendingApprovals = useMemo(() => {
    return entries.filter(e => e.status === 'pending').slice(0, 3);
  }, [entries]);

  const handleStatusChange = (id: string, newStatus: 'approved' | 'rejected') => {
    const updated = entries.map(e => e.id === id ? { ...e, status: newStatus } : e);
    onUpdateEntries(updated);
  };

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const last7Days = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    last7Days.forEach(day => days[day] = 0);
    filteredEntries.forEach(e => {
      if (days[e.date] !== undefined) {
        days[e.date] += e.hours;
      }
    });

    return Object.entries(days).map(([name, hours]) => ({ name: name.split('-').slice(1).join('/'), hours }));
  }, [filteredEntries]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Hours" value={stats.totalHours.toFixed(1)} subtext="Active duration" icon={Clock} color="accent" />
        <StatCard label={user.role === UserRole.CLIENT ? "Billed" : "Earnings"} value={`$${stats.totalEarnings.toLocaleString()}`} subtext="Calculated total" icon={DollarSign} color="success" />
        <StatCard label="Kilometers" value={stats.totalKM.toFixed(1)} subtext="Travel logs" icon={MapPin} color="warning" />
        <StatCard label="Pending" value={stats.pendingCount.toString()} subtext="Awaiting review" icon={AlertCircle} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold">Performance Trends</h3>
                <p className="text-sm text-gray-500">Service delivery hours (Last 7 Days)</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3498db" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Area type="monotone" dataKey="hours" stroke="#3498db" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {user.role === UserRole.MANAGER && pendingApprovals.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Quick Approvals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pendingApprovals.map(e => (
                  <div key={e.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 mb-1">{e.staffName}</p>
                    <p className="font-bold text-sm truncate mb-3">{e.clientName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-accent">{e.hours}h</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusChange(e.id, 'approved')} className="text-success hover:scale-110 transition-transform"><CheckCircle size={20}/></button>
                        <button onClick={() => handleStatusChange(e.id, 'rejected')} className="text-danger hover:scale-110 transition-transform"><XCircle size={20}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-fit">
          <h3 className="text-lg font-bold mb-6">Activity Feed</h3>
          <div className="space-y-4">
            {filteredEntries.slice(-4).reverse().map((entry) => (
              <div key={entry.id} className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 transition-all">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Clock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate">{entry.clientName}</h4>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">{entry.serviceType}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-black text-success">${entry.totalEarnings.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-500">{entry.date}</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Empty log</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subtext, icon: Icon, color }: any) => {
  const colorMap: any = { accent: 'text-accent bg-accent/10', success: 'text-success bg-success/10', warning: 'text-warning bg-warning/10', danger: 'text-danger bg-danger/10' };
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-xl font-black">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
