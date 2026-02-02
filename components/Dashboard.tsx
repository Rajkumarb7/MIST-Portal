
import React, { useMemo, useState } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingUp, DollarSign, MapPin, AlertCircle, CheckCircle, XCircle, Filter, Users, Briefcase, Calendar } from 'lucide-react';

interface DashboardProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
  onUpdateEntries: (entries: TimesheetEntry[]) => void;
}

// Helper to get fortnight boundaries (assuming fortnights start on Monday)
const getFortnightDates = (weeksBack: number = 0) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Get this Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  // Determine which week of the fortnight we're in (even or odd week number)
  const weekNumber = Math.floor((thisMonday.getTime() - new Date(thisMonday.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const isSecondWeekOfFortnight = weekNumber % 2 === 1;

  // Calculate start of current fortnight
  const fortnightStart = new Date(thisMonday);
  if (isSecondWeekOfFortnight) {
    fortnightStart.setDate(fortnightStart.getDate() - 7);
  }

  // Apply weeksBack offset (in fortnights)
  fortnightStart.setDate(fortnightStart.getDate() - (weeksBack * 14));

  const fortnightEnd = new Date(fortnightStart);
  fortnightEnd.setDate(fortnightEnd.getDate() + 13);

  return {
    start: fortnightStart.toISOString().split('T')[0],
    end: fortnightEnd.toISOString().split('T')[0]
  };
};

const Dashboard: React.FC<DashboardProps> = ({ user, entries, clients, staff, onUpdateEntries }) => {
  const [filterStaff, setFilterStaff] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Role-based filtering
    if (user.role === UserRole.STAFF) {
      result = result.filter(e => e.staffId === user.id);
    } else if (user.role === UserRole.CLIENT) {
      result = result.filter(e => e.clientId === user.id);
    }

    // Additional filters
    if (filterStaff) {
      result = result.filter(e => e.staffId === filterStaff);
    }
    if (filterClient) {
      result = result.filter(e => e.clientId === filterClient);
    }

    // Date range filter
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      result = result.filter(e => e.date >= customStartDate && e.date <= customEndDate);
    } else if (dateRange === 'fortnight') {
      const { start, end } = getFortnightDates(0);
      result = result.filter(e => e.date >= start && e.date <= end);
    } else if (dateRange === 'lastfortnight') {
      const { start, end } = getFortnightDates(1);
      result = result.filter(e => e.date >= start && e.date <= end);
    } else if (dateRange !== 'all') {
      const now = new Date();
      const daysAgo = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
      const cutoff = new Date(now.setDate(now.getDate() - daysAgo)).toISOString().split('T')[0];
      result = result.filter(e => e.date >= cutoff);
    }

    return result;
  }, [user, entries, filterStaff, filterClient, dateRange, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    const workEarnings = filteredEntries.reduce((sum, e) => sum + e.workEarnings, 0);
    const travelEarnings = filteredEntries.reduce((sum, e) => sum + e.travelEarnings, 0);
    const totalEarnings = filteredEntries.reduce((sum, e) => sum + e.totalEarnings, 0);
    const totalKM = filteredEntries.reduce((sum, e) => sum + e.km, 0);
    const pendingCount = filteredEntries.filter(e => e.status === 'pending').length;

    return { totalHours, workEarnings, travelEarnings, totalEarnings, totalKM, pendingCount };
  }, [filteredEntries]);

  // Breakdown by Staff
  const staffBreakdown = useMemo(() => {
    const breakdown: Record<string, { hours: number; kms: number; earnings: number }> = {};
    filteredEntries.forEach(e => {
      if (!breakdown[e.staffName]) {
        breakdown[e.staffName] = { hours: 0, kms: 0, earnings: 0 };
      }
      breakdown[e.staffName].hours += e.hours;
      breakdown[e.staffName].kms += e.km;
      breakdown[e.staffName].earnings += e.totalEarnings;
    });
    return Object.entries(breakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.earnings - a.earnings);
  }, [filteredEntries]);

  // Breakdown by Client
  const clientBreakdown = useMemo(() => {
    const breakdown: Record<string, { hours: number; kms: number; earnings: number }> = {};
    filteredEntries.forEach(e => {
      if (!breakdown[e.clientName]) {
        breakdown[e.clientName] = { hours: 0, kms: 0, earnings: 0 };
      }
      breakdown[e.clientName].hours += e.hours;
      breakdown[e.clientName].kms += e.km;
      breakdown[e.clientName].earnings += e.totalEarnings;
    });
    return Object.entries(breakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.earnings - a.earnings);
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

  // Earnings breakdown for pie chart
  const earningsBreakdown = [
    { name: 'Work Hours', value: stats.workEarnings, color: '#00a9ce' },
    { name: 'Travel/KMs', value: stats.travelEarnings, color: '#10b981' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters - Manager Only */}
      {user.role === UserRole.MANAGER && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <Filter size={16} /> Filters:
            </div>
            <select
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-0 outline-none"
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
            >
              <option value="">All Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-0 outline-none"
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-0 outline-none"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="fortnight">Current Fortnight</option>
              <option value="lastfortnight">Last Fortnight</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateRange === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <input
                    type="date"
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-0 outline-none"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    placeholder="Start"
                  />
                </div>
                <span className="text-slate-400 text-sm">to</span>
                <input
                  type="date"
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold border-0 outline-none"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  placeholder="End"
                />
              </>
            )}
            {(filterStaff || filterClient || dateRange !== 'all') && (
              <button
                onClick={() => { setFilterStaff(''); setFilterClient(''); setDateRange('all'); setCustomStartDate(''); setCustomEndDate(''); }}
                className="px-4 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-xl"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Hours" value={stats.totalHours.toFixed(1)} subtext="Active duration" icon={Clock} color="accent" />
        <StatCard label={user.role === UserRole.CLIENT ? "Billed" : "Total Earnings"} value={`$${stats.totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} subtext={`Work: $${stats.workEarnings.toFixed(0)} | Travel: $${stats.travelEarnings.toFixed(0)}`} icon={DollarSign} color="success" />
        <StatCard label="Kilometers" value={stats.totalKM.toFixed(1)} subtext={`@ $${(stats.travelEarnings / (stats.totalKM || 1)).toFixed(2)}/km avg`} icon={MapPin} color="warning" />
        <StatCard label="Pending" value={stats.pendingCount.toString()} subtext="Awaiting review" icon={AlertCircle} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
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
                      <stop offset="5%" stopColor="#00a9ce" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00a9ce" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Area type="monotone" dataKey="hours" stroke="#00a9ce" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Earnings Breakdown by Staff */}
          {user.role === UserRole.MANAGER && staffBreakdown.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users size={20} className="text-mistTeal" /> Earnings by Staff
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left py-3">Staff</th>
                      <th className="text-right py-3">Hours</th>
                      <th className="text-right py-3">KMs</th>
                      <th className="text-right py-3">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {staffBreakdown.slice(0, 5).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 font-bold">{item.name}</td>
                        <td className="py-3 text-right">{item.hours.toFixed(1)}h</td>
                        <td className="py-3 text-right">{item.kms.toFixed(1)}</td>
                        <td className="py-3 text-right font-bold text-success">${item.earnings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Earnings Breakdown by Client */}
          {user.role === UserRole.MANAGER && clientBreakdown.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-mistTeal" /> Earnings by Client
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left py-3">Client</th>
                      <th className="text-right py-3">Hours</th>
                      <th className="text-right py-3">KMs</th>
                      <th className="text-right py-3">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {clientBreakdown.slice(0, 5).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 font-bold">{item.name}</td>
                        <td className="py-3 text-right">{item.hours.toFixed(1)}h</td>
                        <td className="py-3 text-right">{item.kms.toFixed(1)}</td>
                        <td className="py-3 text-right font-bold text-success">${item.earnings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Approvals - Manager Only */}
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

        {/* Right Column */}
        <div className="space-y-8">
          {/* Earnings Pie Chart */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Earnings Breakdown</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={earningsBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {earningsBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {earningsBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
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
          <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
