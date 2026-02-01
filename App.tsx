
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AuthState, Staff, Client, TimesheetEntry } from './types';
import { storage } from './services/storage';
import { AUTH_CONFIG } from './constants';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  Clock, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Moon, 
  Sun,
  ShieldCheck,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';

// Components
import AuthOverlay from './components/AuthOverlay';
import Dashboard from './components/Dashboard';
import StaffManagement from './components/StaffManagement';
import ClientManagement from './components/ClientManagement';
import TimesheetManagement from './components/TimesheetManagement';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(storage.getTheme());
  
  // App Data
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);

  useEffect(() => {
    setStaff(storage.getStaff());
    setClients(storage.getClients());
    setEntries(storage.getEntries());
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogin = (role: UserRole, id: string, name: string) => {
    setAuthState({
      user: { id, name, role },
      isAuthenticated: true
    });
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setAuthState({ user: null, isAuthenticated: false });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    storage.saveTheme(newTheme);
  };

  const saveData = (newStaff?: Staff[], newClients?: Client[], newEntries?: TimesheetEntry[]) => {
    if (newStaff) { storage.saveStaff(newStaff); setStaff(newStaff); }
    if (newClients) { storage.saveClients(newClients); setClients(newClients); }
    if (newEntries) { storage.saveEntries(newEntries); setEntries(newEntries); }
  };

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: [UserRole.MANAGER, UserRole.STAFF, UserRole.CLIENT] },
      { id: 'staff', label: 'Support Workers', icon: Users, roles: [UserRole.MANAGER] },
      { id: 'clients', label: 'Clients', icon: Home, roles: [UserRole.MANAGER] },
      { id: 'timesheet', label: 'Shift Logs', icon: Clock, roles: [UserRole.MANAGER, UserRole.STAFF] },
      { id: 'reports', label: 'Financials', icon: BarChart3, roles: [UserRole.MANAGER, UserRole.STAFF, UserRole.CLIENT] },
      { id: 'analytics', label: 'Insights', icon: PieChart, roles: [UserRole.MANAGER] },
      { id: 'settings', label: 'Portal Settings', icon: SettingsIcon, roles: [UserRole.MANAGER] }
    ];
    return items.filter(item => authState.user && item.roles.includes(authState.user.role));
  }, [authState.user]);

  if (!authState.isAuthenticated) {
    return <AuthOverlay onLogin={handleLogin} staff={staff} clients={clients} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-mistNavy border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex sticky top-0 h-screen text-white">
        <div className="p-8 border-b border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-mistNavy shadow-xl">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl leading-tight tracking-tight uppercase">MIST</h1>
            <span className="text-[10px] text-mistTeal font-bold uppercase tracking-[0.2em]">Management</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-mistTeal text-white shadow-lg shadow-mistTeal/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'opacity-100' : 'opacity-60'} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-5 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Day Mode' : 'Night Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-3 rounded-xl font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={20} />
            Exit Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-24 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 sticky top-0 z-30">
          <div>
            <h2 className="text-2xl font-black text-mistNavy dark:text-white capitalize tracking-tight">{activeTab}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              Current User: {authState.user?.name}
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <ShieldCheck size={16} className="text-mistTeal" />
              {authState.user?.role.toUpperCase()} ACCESS
            </div>
            <div className="w-12 h-12 rounded-2xl bg-mistNavy text-white flex items-center justify-center font-black text-xl shadow-lg">
              {authState.user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard user={authState.user!} entries={entries} clients={clients} staff={staff} onUpdateEntries={(e) => saveData(undefined, undefined, e)} />}
          {activeTab === 'staff' && authState.user?.role === UserRole.MANAGER && (
            <StaffManagement staff={staff} onUpdate={(s) => saveData(s)} />
          )}
          {activeTab === 'clients' && authState.user?.role === UserRole.MANAGER && (
            <ClientManagement clients={clients} onUpdate={(c) => saveData(undefined, c)} />
          )}
          {activeTab === 'timesheet' && (
            <TimesheetManagement 
              user={authState.user!} 
              entries={entries} 
              clients={clients} 
              staff={staff}
              onUpdate={(e) => saveData(undefined, undefined, e)} 
            />
          )}
          {activeTab === 'reports' && <Reports user={authState.user!} entries={entries} clients={clients} staff={staff} />}
          {activeTab === 'analytics' && authState.user?.role === UserRole.MANAGER && (
            <Analytics entries={entries} clients={clients} staff={staff} />
          )}
          {activeTab === 'settings' && authState.user?.role === UserRole.MANAGER && (
            <Settings user={authState.user!} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
