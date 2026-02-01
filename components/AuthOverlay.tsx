
import React, { useState, useEffect } from 'react';
import { UserRole, Staff, Client } from '../types';
import { AUTH_CONFIG } from '../constants';
import { Lock, Shield, User as UserIcon, Activity, AlertTriangle } from 'lucide-react';

interface AuthOverlayProps {
  onLogin: (role: UserRole, id: string, name: string) => void;
  staff: Staff[];
  clients: Client[];
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLogin, staff, clients }) => {
  const [role, setRole] = useState<UserRole | ''>('');
  const [identityId, setIdentityId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // For password change logic
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingLogin, setPendingLogin] = useState<any>(null);

  const getSavedPassword = (id: string, role: string) => {
    return localStorage.getItem(`mist_pass_${role}_${id}`);
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
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 relative z-10 shadow-inner">
            <Activity size={40} className="text-mistTeal" />
          </div>
          <h2 className="text-3xl font-black tracking-tight relative z-10 uppercase">MIST PORTAL</h2>
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

          <div className="text-center pt-2">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">MIST ENTERPRISE &copy; 2025</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthOverlay;
