
import React, { useMemo, useState } from 'react';
import { User, UserRole, TimesheetEntry, Client, Staff } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileDown, Calendar, ArrowRight, MapPin, X, Mail, FileSpreadsheet, Download } from 'lucide-react';
import { exportToCSV } from '../utils/csvExport';
import { syncService } from '../services/sync';

interface ReportsProps {
  user: User;
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
}

const Reports: React.FC<ReportsProps> = ({ user, entries, clients, staff }) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    if (user.role === UserRole.MANAGER) return entries;
    if (user.role === UserRole.STAFF) return entries.filter(e => e.staffId === user.id);
    if (user.role === UserRole.CLIENT) return entries.filter(e => e.clientId === user.id);
    return [];
  }, [user, entries]);

  const handleExportCSV = () => {
    const exportData = filteredEntries.map(e => ({
      Date: e.date,
      Staff: e.staffName,
      Client: e.clientName,
      Service: e.serviceType,
      'Shift Type': e.shiftType,
      'Start Time': e.startTime,
      'End Time': e.endTime,
      Hours: e.hours,
      'Hourly Rate': e.hours > 0 ? (e.workEarnings / e.hours).toFixed(2) : '0.00',
      KM: e.km,
      'KM Rate': e.km > 0 ? (e.travelEarnings / e.km).toFixed(2) : '0.00',
      'Work Earnings': e.workEarnings,
      'Travel Earnings': e.travelEarnings,
      'Total Earnings': e.totalEarnings,
      Status: e.status,
      Notes: e.notes
    }));
    exportToCSV(exportData, `MIST_Report_${new Date().toISOString().split('T')[0]}`);
    setExportSuccess('CSV file downloaded successfully!');
    setTimeout(() => {
      setExportSuccess(null);
      setShowExportModal(false);
    }, 2000);
  };

  const handleExportEmail = () => {
    const adminEmail = 'admin@mistau.com'; // Default admin email
    const emailLink = syncService.generateEmailReport(adminEmail, filteredEntries);
    window.location.href = emailLink;
    setExportSuccess('Email client opened!');
    setTimeout(() => {
      setExportSuccess(null);
      setShowExportModal(false);
    }, 2000);
  };

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
        <button
          onClick={() => setShowExportModal(true)}
          className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 transition-colors"
        >
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-mistNavy/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">Export Report</h3>
                  <p className="text-xs text-slate-500">Choose export format</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              {exportSuccess ? (
                <div className="p-6 bg-success/10 text-success rounded-2xl text-center">
                  <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download size={24} />
                  </div>
                  <p className="font-bold">{exportSuccess}</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleExportCSV}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 hover:bg-accent hover:text-white rounded-2xl flex items-center gap-4 transition-all group"
                  >
                    <div className="w-12 h-12 bg-success/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet size={24} className="text-success group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Download CSV</p>
                      <p className="text-xs text-slate-500 group-hover:text-white/70">Export as spreadsheet file</p>
                    </div>
                  </button>

                  <button
                    onClick={handleExportEmail}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-800 hover:bg-accent hover:text-white rounded-2xl flex items-center gap-4 transition-all group"
                  >
                    <div className="w-12 h-12 bg-accent/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center">
                      <Mail size={24} className="text-accent group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Send via Email</p>
                      <p className="text-xs text-slate-500 group-hover:text-white/70">Open in your email client</p>
                    </div>
                  </button>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 text-center">
                      Exporting {filteredEntries.length} timesheet entries
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
