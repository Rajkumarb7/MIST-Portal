
import React, { useState } from 'react';
import { User } from '../types';
import { Settings as SettingsIcon, Save, Shield, Building, Cloud, Database, Mail, Download, Upload, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('mist_webhook_url') || '');
  const [managerEmail, setManagerEmail] = useState(localStorage.getItem('mist_manager_email') || 'manager@mistau.com');
  const [companyName, setCompanyName] = useState('MIST | Mobile Intensive Services Team');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const clearAllData = () => {
    // Remove all app data from localStorage (keep webhook URL, email, passwords, theme)
    localStorage.removeItem('timesheet_staff_v3');
    localStorage.removeItem('timesheet_clients_v3');
    localStorage.removeItem('timesheet_entries_v3');
    // Reset confirm state then reload so the app starts completely fresh
    setConfirmClear(false);
    window.location.reload();
  };

  const saveIntegrations = () => {
    localStorage.setItem('mist_webhook_url', webhookUrl);
    localStorage.setItem('mist_manager_email', managerEmail);
    alert("Integration parameters updated successfully.");
  };

  const exportBackup = () => {
    const data = {
      staff: storage.getStaff(),
      clients: storage.getClients(),
      entries: storage.getEntries(),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mist_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const changePassword = () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match');
      return;
    }

    // Get stored password
    const passwordKey = `mist_pass_manager_${user.id}`;
    const storedPassword = localStorage.getItem(passwordKey);
    const defaultPassword = 'benjo234'; // From AUTH_CONFIG

    // Verify current password
    if (currentPassword !== (storedPassword || defaultPassword)) {
      alert('Current password is incorrect');
      return;
    }

    // Save new password
    localStorage.setItem(passwordKey, newPassword);
    alert('Password changed successfully! Use your new password on next login.');

    // Clear fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-mistNavy">
            <SettingsIcon className="text-mistTeal" size={24} />
            Portal Control
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            MIST Enterprise configurations. Ensure cloud endpoints are active for real-time reporting.
          </p>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Cloud Integration */}
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Cloud size={20} className="text-mistTeal" />
              <h4 className="font-bold text-mistNavy dark:text-white">Cloud & Google Sheets</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Apps Script Webhook</label>
                <input 
                  type="text" 
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Email Destination</label>
                <div className="relative">
                   <Mail className="absolute left-4 top-4 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium text-sm"
                  />
                </div>
              </div>
              <button onClick={saveIntegrations} className="mt-2 w-full py-4 bg-mistTeal text-white rounded-2xl font-black shadow-lg shadow-mistTeal/20 flex items-center justify-center gap-2 hover:bg-mistTeal/90 transition-all">
                <Save size={18} /> Save Sync Settings
              </button>
            </div>
          </section>

          {/* Security & Password Management */}
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={20} className="text-mistTeal" />
              <h4 className="font-bold text-mistNavy dark:text-white">Security & Access Control</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium text-sm"
                />
              </div>
              <button
                onClick={changePassword}
                className="mt-2 w-full py-4 bg-mistNavy text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-mistNavy/90 transition-all"
              >
                <Shield size={18} /> Change Password
              </button>
            </div>
          </section>

          {/* Backup & Disaster Recovery */}
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Database size={20} className="text-warning" />
              <h4 className="font-bold text-mistNavy dark:text-white">Data Management</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={exportBackup}
                className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-mistTeal transition-all group"
              >
                <Download size={24} className="text-slate-400 group-hover:text-mistTeal mb-2" />
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Download Backup</span>
              </button>
              <button
                className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-warning transition-all group opacity-50 cursor-not-allowed"
                title="Restore feature coming in V3.2"
              >
                <Upload size={24} className="text-slate-400 group-hover:text-warning mb-2" />
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Restore Data</span>
              </button>
            </div>

            {/* Clear All Data */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Danger Zone</p>

              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                >
                  <Trash2 size={18} /> Clear All Local Cache
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-900/20 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-black text-red-700 dark:text-red-400 text-sm">Confirm Clear All Data?</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        This will wipe <strong>all staff, client, and shift data</strong> from this browser. Your Google Sheet is unaffected — you can Pull fresh data again after clearing.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={clearAllData}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
                    >
                      <RefreshCw size={15} /> Yes, Clear & Restart
                    </button>
                  </div>
                </div>
              )}

              {/* Google Sheets instructions */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <p className="font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-[10px] mb-2">Also clear Google Sheet rows?</p>
                <p>1. Open your Google Sheet</p>
                <p>2. On each tab (Staff, Clients, Timesheets) — select all data rows <strong>below the header row</strong></p>
                <p>3. Right-click → <strong>Delete rows</strong> (do NOT delete the header row)</p>
                <p>4. Come back here, click <strong>Clear All Local Cache</strong>, then re-enter your data fresh</p>
              </div>
            </div>
          </section>
          
          <div className="p-6 bg-mistNavy rounded-[2rem] text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="text-mistTeal" size={32} />
              <div>
                <p className="font-black text-sm">Security Protocols Active</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Encrypted Local Persistence Mode</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-bold">V3.1 STABLE</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
