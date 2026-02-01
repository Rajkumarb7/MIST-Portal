
import React, { useState } from 'react';
import { User } from '../types';
import { Settings as SettingsIcon, Save, Shield, Building, Cloud, Database, Mail, Download, Upload } from 'lucide-react';
import { storage } from '../services/storage';

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('mist_webhook_url') || '');
  const [managerEmail, setManagerEmail] = useState(localStorage.getItem('mist_manager_email') || 'manager@mistau.com');
  const [companyName, setCompanyName] = useState('MIST | Mobile Intensive Services Team');

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

          {/* Backup & Disaster Recovery */}
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Database size={20} className="text-warning" />
              <h4 className="font-bold text-mistNavy dark:text-white">Data Management</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
