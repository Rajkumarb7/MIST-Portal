
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AuthState, Staff, Client, TimesheetEntry } from './types';
import { storage } from './services/storage';
import { syncService } from './services/sync';
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
  Activity,
  Cloud,
  CloudOff,
  Loader2,
  Menu,
  X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App Data
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);

  // Sync status — updated only by explicit manual Push (in TimesheetManagement)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Get webhook URL from localStorage
  const getWebhookUrl = () => localStorage.getItem('mist_webhook_url');

  // Load initial data from localStorage
  useEffect(() => {
    setStaff(storage.getStaff());
    setClients(storage.getClients());
    setEntries(storage.getEntries());
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // On startup: pull client list from cloud (always fresh).
  // Staff (including rates) are only loaded from cloud on a NEW device (empty localStorage).
  // This prevents rates set by the manager from being overwritten on every page refresh.
  // To force-refresh staff data on an existing device, use the "Pull from Cloud" button.
  useEffect(() => {
    const webhookUrl = localStorage.getItem('mist_webhook_url');
    if (!webhookUrl) return;

    // Check NOW (before async pull) whether this device already has local staff data
    const hasLocalStaff = storage.getStaff().length > 0;

    syncService.loadFromCloud(webhookUrl)
      .then(data => {
        if (!data) return;

        // Only overwrite staff from cloud on a fresh device — preserves manager-set rates
        if (!hasLocalStaff && data.staff && (data.staff as any[]).length > 0) {
          const loadedStaff: Staff[] = (data.staff as any[]).map((s: any) => ({
            id: String(s.id ?? s.ID ?? ''),
            name: s.name || s.Name || '',
            role: s.role || s.Role || 'Support Worker',
            email: s.email || s.Email || '',
            phone: s.phone || s.Phone || '',
            startDate: s.startdate || s.startDate || '',
            active: s.active === 'Yes' || s.active === true,
            rates: {
              day:          Number(s.dayrate)        || 65,
              evening:      Number(s.eveningrate)    || 72,
              night:        Number(s.nightrate)      || 85,
              sleepover:    Number(s.sleepoverrate)  || 250,
              saturday:     Number(s.saturdayrate)   || 95,
              sunday:       Number(s.sundayrate)     || 125,
              publicHoliday:Number(s.holidayrate)    || 160,
              km:           Number(s.kmrate)         || 0.96,
            }
          })).filter((s: any) => s.id && s.name);

          if (loadedStaff.length > 0) {
            storage.saveStaff(loadedStaff);
            setStaff(loadedStaff);
          }
        }

        // Always refresh client list from cloud (shared across all devices)
        if (data.clients && (data.clients as any[]).length > 0) {
          const loadedClients: Client[] = (data.clients as any[]).map((c: any) => ({
            id: String(c.id ?? c.ID ?? ''),
            name: String(c.name || c.Name || '')
          })).filter((c: any) => c.id && c.name);

          if (loadedClients.length > 0) {
            storage.saveClients(loadedClients);
            setClients(loadedClients);
          }
        }
      })
      .catch(() => { /* startup pull failure is non-fatal — localStorage data is used */ });
  }, []); // runs once on mount only
  // NOTE: Auto-sync removed. Push is explicit only — "Push to Cloud" button in Shift Logs.
  // Staff rates are preserved locally; use "Pull from Cloud" to force-refresh from sheet.

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

  // Handle data loaded from cloud (for new devices)
  const handleDataLoaded = (newStaff: Staff[], newClients: Client[]) => {
    setStaff(newStaff);
    setClients(newClients);
  };

  if (!authState.isAuthenticated) {
    return <AuthOverlay onLogin={handleLogin} staff={staff} clients={clients} onDataLoaded={handleDataLoaded} />;
  }

  // Close mobile menu when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile slide-in */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-72 bg-mistNavy border-r border-slate-200 dark:border-slate-800
        flex flex-col text-white z-50 transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/MIST-Portal/mist-logo.png"
              alt="MIST"
              className="h-12 md:h-14"
            />
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 hover:bg-white/10 rounded-xl"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 md:p-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 rounded-2xl font-semibold transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-mistTeal text-white shadow-lg shadow-mistTeal/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'opacity-100' : 'opacity-60'} />
              <span className="text-sm md:text-base">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 md:p-6 border-t border-white/10 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Day Mode' : 'Night Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={20} />
            Exit Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto pb-20 md:pb-0">
        <header className="h-16 md:h-24 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-10 sticky top-0 z-30">
          {/* Mobile menu button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-mistNavy dark:text-white capitalize tracking-tight">{activeTab}</h2>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Current User: {authState.user?.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Sync Status Indicator */}
            {getWebhookUrl() && (
              <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${
                syncStatus === 'syncing' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                syncStatus === 'synced' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                syncStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin" />}
                {syncStatus === 'synced' && <Cloud size={12} />}
                {syncStatus === 'error' && <CloudOff size={12} />}
                {syncStatus === 'idle' && <Cloud size={12} />}
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing' ? 'Syncing...' :
                   syncStatus === 'synced' ? 'Synced' :
                   syncStatus === 'error' ? 'Error' :
                   lastSyncTime ? `Last: ${lastSyncTime}` : 'Cloud Ready'}
                </span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <ShieldCheck size={16} className="text-mistTeal" />
              {authState.user?.role.toUpperCase()} ACCESS
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-mistNavy text-white flex items-center justify-center font-black text-lg md:text-xl shadow-lg">
              {authState.user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard user={authState.user!} entries={entries} clients={clients} staff={staff} onUpdateEntries={(e) => saveData(undefined, undefined, e)} />}
          {activeTab === 'staff' && authState.user?.role === UserRole.MANAGER && (
            <StaffManagement
              staff={staff}
              onUpdate={(s) => saveData(s)}
              entries={entries}
              onUpdateEntries={(e) => saveData(undefined, undefined, e)}
            />
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
              onUpdateStaff={(s) => saveData(s)}
              onUpdateClients={(c) => saveData(undefined, c)}
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-mistNavy border-t border-slate-200 dark:border-slate-800 md:hidden z-40 safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] transition-all ${
                activeTab === item.id
                  ? 'text-mistTeal bg-mistTeal/10'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold truncate">{item.label.split(' ')[0]}</span>
            </button>
          ))}
          {/* More menu for additional items */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
