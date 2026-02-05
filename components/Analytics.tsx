
import React, { useMemo } from 'react';
import { TimesheetEntry, Client, Staff } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Target, TrendingUp, Users, Activity } from 'lucide-react';

interface AnalyticsProps {
  entries: TimesheetEntry[];
  clients: Client[];
  staff: Staff[];
}

const Analytics: React.FC<AnalyticsProps> = ({ entries, clients, staff }) => {
  // Calculate actual metrics from data
  const metrics = useMemo(() => {
    const totalEntries = entries.length;
    const approvedEntries = entries.filter(e => e.status === 'approved').length;
    const totalHours = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
    const avgShiftDuration = totalEntries > 0 ? (totalHours / totalEntries) : 0;

    // Operational efficiency = approved / total (or 0 if no entries)
    const efficiency = totalEntries > 0 ? Math.round((approvedEntries / totalEntries) * 100) : 0;

    // Active staff = staff who have logged entries
    const activeStaffIds = new Set(entries.map(e => e.staffId));
    const activeStaffCount = activeStaffIds.size;

    // Unique clients served
    const uniqueClients = new Set(entries.map(e => e.clientId));
    const clientsServed = uniqueClients.size;

    // Client retention = clients with entries / total clients (or 0 if no clients)
    const retention = clients.length > 0 ? Math.round((clientsServed / clients.length) * 100) : 0;

    return {
      efficiency: totalEntries > 0 ? `${efficiency}%` : '0%',
      activeStaff: activeStaffCount.toString(),
      avgShift: totalEntries > 0 ? `${avgShiftDuration.toFixed(1)}h` : '0h',
      retention: clients.length > 0 ? `${retention}%` : '0%'
    };
  }, [entries, clients]);

  const serviceDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.serviceType] = (counts[e.serviceType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const staffPerformance = useMemo(() => {
    // Top 5 staff by total hours
    const staffHours: Record<string, number> = {};
    entries.forEach(e => {
      staffHours[e.staffName] = (staffHours[e.staffName] || 0) + (Number(e.hours) || 0);
    });
    return Object.entries(staffHours)
      .map(([name, hours]) => ({ name, value: hours }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [entries]);

  const COLORS = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Approval Rate" value={metrics.efficiency} icon={Target} color="accent" />
        <MetricCard title="Active Staff" value={metrics.activeStaff} icon={Users} color="success" />
        <MetricCard title="Avg Shift Duration" value={metrics.avgShift} icon={Activity} color="warning" />
        <MetricCard title="Client Coverage" value={metrics.retention} icon={TrendingUp} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold mb-6">Service Type Distribution</h4>
          <div className="h-[300px] flex items-center justify-center">
            {serviceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <p className="text-sm font-medium">No shift data yet</p>
                <p className="text-xs mt-1">Log shifts to see service distribution</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold mb-6">Top Performing Staff (By Hours)</h4>
          <div className="h-[300px] flex items-center justify-center">
            {staffPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={staffPerformance}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="name" stroke="#666" fontSize={10} />
                  <PolarRadiusAxis stroke="#666" fontSize={10} />
                  <Radar
                    name="Hours"
                    dataKey="value"
                    stroke="#3498db"
                    fill="#3498db"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400">
                <p className="text-sm font-medium">No staff performance data</p>
                <p className="text-xs mt-1">Log shifts to see staff performance</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = {
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger'
  };
  return (
    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-200 dark:border-gray-800">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black mt-1">{value}</h3>
    </div>
  );
};

export default Analytics;
