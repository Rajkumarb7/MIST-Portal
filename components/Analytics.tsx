
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
        <MetricCard title="Operational Efficiency" value="94%" icon={Target} color="accent" />
        <MetricCard title="Active Staff" value={staff.length.toString()} icon={Users} color="success" />
        <MetricCard title="Avg Shift Duration" value="6.4h" icon={Activity} color="warning" />
        <MetricCard title="Client Retention" value="100%" icon={TrendingUp} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold mb-6">Service Type Distribution</h4>
          <div className="h-[300px]">
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
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold mb-6">Top Performing Staff (By Hours)</h4>
          <div className="h-[300px]">
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
