
import React, { useState, useEffect } from 'react';
import { UserRole, Staff, Client } from '../types';
import { AUTH_CONFIG } from '../constants';
import { Lock, Shield, User as UserIcon, Activity, AlertTriangle, Cloud, CloudOff, Loader2, Link2 } from 'lucide-react';
import { syncService } from '../services/sync';
import { storage } from '../services/storage';

interface AuthOverlayProps {
  onLogin: (role: UserRole, id: string, name: string) => void;
  staff: Staff[];
  clients: Client[];
  onDataLoaded?: (staff: Staff[], clients: Client[]) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin, staff, clients, onDataLoaded }) => {
  const [role, setRole] = useState<UserRole | ''>('');
  const [identityId, setIdentityId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Cloud connect state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('mist_webhook_url') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  // Check if connected on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('mist_webhook_url');
    if (savedUrl) {
      setCloudStatus('connected');
    }
  }, []);
  
  // For password change logic
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingLogin, setPendingLogin] = useState<any>(null);

  const getSavedPassword = (id: string, role: string) => {
    return localStorage.getItem(`mist_pass_${role}_${id}`);
  };

  // Load data from Google Sheets
  const handleLoadFromCloud = async () => {
    if (!webhookUrl.trim()) {
      setError('Please enter the team sync URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await syncService.loadFromCloud(webhookUrl.trim());

      if (data) {
        // Transform the data from Google Sheets format
        // Staff now includes rates (moved from clients)
        const loadedStaff: Staff[] = (data.staff || []).map((s: any) => ({
          id: s.id || s.ID,
          name: s.name || s.Name,
          role: s.role || s.Role || 'Support Worker',
          email: s.email || s.Email || '',
          phone: s.phone || s.Phone || '',
          startDate: s.startdate || s.startDate || s.StartDate || '',
          active: s.active === 'Yes' || s.active === true || s.Active === 'Yes',
          rates: {
            day: Number(s.dayrate || s.day || s.DayRate || 65),
            evening: Number(s.eveningrate || s.evening || s.EveningRate || 72),
            night: Number(s.nightrate || s.night || s.NightRate || 85),
            sleepover: Number(s.sleepoverrate || s.sleepover || s.SleepoverRate || 250),
            saturday: Number(s.saturdayrate || s.saturday || s.SaturdayRate || 95),
            sunday: Number(s.sundayrate || s.sunday || s.SundayRate || 125),
            publicHoliday: Number(s.holidayrate || s.publicholiday || s.PublicHolidayRate || 160),
            km: Number(s.kmrate || s.km || s.KMRate || 0.96)
          }
        }));

        // Clients now only have id and name (rates moved to staff)
        const loadedClients: Client[] = (data.clients || []).map((c: any) => ({
          id: c.id || c.ID,
          name: c.name || c.Name
        }));

        // Save to localStorage
        localStorage.setItem('mist_webhook_url', webhookUrl.trim());
        storage.saveStaff(loadedStaff);
        storage.saveClients(loadedClients);

        setCloudStatus('connected');
        setShowConnectModal(false);

        // Notify parent to refresh data
        if (onDataLoaded) {
          onDataLoaded(loadedStaff, loadedClients);
        } else {
          // Fallback: reload the page to pick up new data
          window.location.reload();
        }
      } else {
        setError('Could not load team data. Check the URL and try again.');
        setCloudStatus('error');
      }
    } catch (err) {
      console.error('Cloud load error:', err);
      setError('Connection failed. Please check the URL.');
      setCloudStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError('Select access level'); return; }
    
    let id = identityId;
    let name = '';
    
    if (role === UserRole.MANAGER) {
      name = 'MIST Administrator';
      id = 'admin-1';
    } else if (role === UserRole.STAFF) {
      const s = staff.find(x => x.id === identityId);
      if (!s) { setError('Select a worker'); return; }
      name = s.name;
    } else if (role === UserRole.CLIENT) {
      const c = clients.find(x => x.id === identityId);
      if (!c) { setError('Select a client'); return; }
      name = c.name;
    }

    const defaultPass = AUTH_CONFIG[role as UserRole];
    const savedPass = getSavedPassword(id, role);

    // If using default password and it's a staff/client, trigger change
    if (password === defaultPass && !savedPass && role !== UserRole.MANAGER) {
      setPendingLogin({ role, id, name });
      setIsChangingPassword(true);
      return;
    }

    // Check against saved or default
    const validPass = savedPass || defaultPass;
    if (password === validPass) {
      onLogin(role as UserRole, id, name);
    } else {
      setError('Invalid security key');
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Key must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Keys do not match'); return; }

    localStorage.setItem(`mist_pass_${pendingLogin.role}_${pendingLogin.id}`, newPassword);
    onLogin(pendingLogin.role, pendingLogin.id, pendingLogin.name);
  };

  // Connect to Team Modal
  if (showConnectModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-mistNavy/95 backdrop-blur-2xl p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-mistTeal/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-mistTeal/10 text-mistTeal rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cloud size={32} />
            </div>
            <h2 className="text-2xl font-black text-mistNavy dark:text-white">Connect to Team</h2>
            <p className="text-sm text-slate-500 mt-2">Enter the sync URL provided by your manager to access team data.</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Sync URL</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none transition-all text-sm"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                />
                <Link2 className="absolute left-4 top-4 text-mistTeal" size={20} />
              </div>
            </div>
            {error && <p className="text-danger text-xs font-bold text-center bg-danger/10 py-2 rounded-xl">{error}</p>}
            <button
              onClick={handleLoadFromCloud}
              disabled={isLoading}
              className="w-full py-5 bg-mistTeal text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Loading Team Data...
                </>
              ) : (
                <>
                  <Cloud size={20} />
                  CONNECT & SYNC
                </>
              )}
            </button>
            <button
              onClick={() => { setShowConnectModal(false); setError(''); }}
              className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isChangingPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-mistNavy/95 backdrop-blur-2xl p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-mistTeal/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-mistNavy dark:text-white">Secure Your Account</h2>
            <p className="text-sm text-slate-500 mt-2">First-time login detected. Please create a private security key.</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Private Key</label>
              <input 
                type="password" 
                required 
                autoFocus
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none transition-all" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Key</label>
              <input 
                type="password" 
                required 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none transition-all" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-danger text-xs font-bold text-center">{error}</p>}
            <button className="w-full py-5 bg-mistTeal text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">ACTIVATE ACCOUNT</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mistNavy/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-mistNavy p-10 text-center text-white relative overflow-hidden">
          <img
            src="/MIST-Portal/mist-logo.png"
            alt="MIST Logo"
            className="h-24 mx-auto mb-4 relative z-10"
          />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 relative z-10">Secure Gateway</p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-8">
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Identity Mode</label>
              <div className="relative">
                <select 
                  value={role} 
                  onChange={(e) => { setRole(e.target.value as UserRole); setIdentityId(''); setError(''); }}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent rounded-2xl focus:ring-4 focus:ring-mistTeal/20 outline-none appearance-none font-bold text-sm transition-all"
                >
                  <option value="">Select Access Level...</option>
                  <option value={UserRole.MANAGER}>Manager</option>
                  <option value={UserRole.STAFF}>Support Worker</option>
                  <option value={UserRole.CLIENT}>Client</option>
                </select>
                <Shield className="absolute left-4 top-4 text-mistTeal" size={20} />
              </div>
            </div>

            {(role === UserRole.STAFF || role === UserRole.CLIENT) && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Account Selection</label>
                <div className="relative">
                  <select 
                    value={identityId} 
                    onChange={(e) => setIdentityId(e.target.value)}
                    required
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent rounded-2xl focus:ring-4 focus:ring-mistTeal/20 outline-none appearance-none font-bold text-sm transition-all"
                  >
                    <option value="">Choose Name...</option>
                    {role === UserRole.STAFF ? (
                      staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    ) : (
                      clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    )}
                  </select>
                  <UserIcon className="absolute left-4 top-4 text-mistTeal" size={20} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Security Key</label>
              <div className="relative">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent rounded-2xl focus:ring-4 focus:ring-mistTeal/20 outline-none font-bold text-sm transition-all"
                />
                <Lock className="absolute left-4 top-4 text-mistTeal" size={20} />
              </div>
            </div>
          </div>

          {error && <p className="text-danger text-center text-[11px] font-black uppercase bg-danger/5 py-3 rounded-xl animate-shake">{error}</p>}

          <button
            type="submit"
            className="w-full py-5 bg-mistNavy hover:bg-mistNavy/90 text-white rounded-2xl font-black shadow-2xl transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            ENTER PORTAL
          </button>

          {/* Connect to Team - for staff/clients on new devices */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 uppercase tracking-widest">New Device?</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              cloudStatus === 'connected'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-2 border-green-200 dark:border-green-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent'
            }`}
          >
            {cloudStatus === 'connected' ? (
              <>
                <Cloud size={18} />
                Team Connected
              </>
            ) : (
              <>
                <Link2 size={18} />
                Connect to Team
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">MIST ENTERPRISE &copy; 2025</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthOverlay;
