
import React, { useMemo } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// Added MapPin to the lucide-react imports
import { FileDown, Calendar, ArrowRight, MapPin } from 'lucide-react';

interface ReportsProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
}

const Reports: React.FC<ReportsProps> = ({ user, entries, clients, staff }) => {
  const filteredEntries = useMemo(() => {
    if (user.role === UserRole.MANAGER) return entries;
    if (user.role === UserRole.STAFF) return entries.filter(e => e.staffId === user.id);
    if (user.role === UserRole.CLIENT) return entries.filter(e => e.clientId === user.id);
    return [];
  }, [user, entries]);

  const clientBreakdown = useMemo(() => {
    const data: Record<string, number> = {};
    filteredEntries.forEach(e => {
      data[e.clientName] = (data[e.clientName] || 0) + e.totalEarnings;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const COLORS = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black">Financial Aggregates</h3>
          <p className="text-sm text-gray-500">Breakdown of earnings and distribution</p>
        </div>
        <button className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-accent/20">
          <FileDown size={18} /> Export Full Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Card */}
        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800">
          <h4 className="font-bold mb-8 flex items-center gap-2">
            <div className="w-2 h-6 bg-accent rounded-full" />
            Earnings by Client
          </h4>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                <XAxis type="number" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#666" fontSize={12} width={100} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                  {clientBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Summary Card */}
        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800">
          <h4 className="font-bold mb-8 flex items-center gap-2">
            <div className="w-2 h-6 bg-success rounded-full" />
            Detailed Aggregates
          </h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Logs</p>
                  <p className="font-bold">{filteredEntries.length} Sessions</p>
                </div>
              </div>
              <ArrowRight className="text-gray-300" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-success/20 text-success flex items-center justify-center">
                  <DollarSign size={20} className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aggregate Payout</p>
                  <p className="font-bold">${clientBreakdown.reduce((sum, d) => sum + d.value, 0).toLocaleString()}</p>
                </div>
              </div>
              <ArrowRight className="text-gray-300" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center">
                  <MapPin size={20} className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kilometer Total</p>
                  <p className="font-bold">{filteredEntries.reduce((sum, e) => sum + e.km, 0).toFixed(1)} KM</p>
                </div>
              </div>
              <ArrowRight className="text-gray-300" />
            </div>
          </div>
          
          <div className="mt-8">
            <div className="p-6 bg-accent rounded-3xl text-white">
              <p className="text-sm font-medium opacity-80 mb-1">Average per Shift</p>
              <h5 className="text-3xl font-black">
                ${filteredEntries.length > 0 
                  ? (clientBreakdown.reduce((sum, d) => sum + d.value, 0) / filteredEntries.length).toFixed(2)
                  : '0.00'
                }
              </h5>
              <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DollarSign = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

export default Reports;
