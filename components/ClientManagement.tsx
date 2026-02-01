
import React, { useState } from 'react';
import { Client, Rates } from '../types';
import { Plus, Search, Trash2, Edit3, DollarSign, X, Save, Users, CreditCard } from 'lucide-react';

interface ClientManagementProps {
  clients: Client[];
  onUpdate: (clients: Client[]) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ clients, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const defaultRates: Rates = { day: 65, evening: 72, night: 85, saturday: 95, sunday: 125, publicHoliday: 160, km: 0.96 };
  const [formData, setFormData] = useState<Partial<Client>>({ name: '', rates: defaultRates });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const item: Client = {
      ...formData as Client,
      id: Date.now().toString(),
    };
    onUpdate([...clients, item]);
    resetForm();
    setIsAdding(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const updated = clients.map(c => c.id === editingClient.id ? { ...editingClient } : c);
    onUpdate(updated);
    setEditingClient(null);
  };

  const resetForm = () => {
    setFormData({ name: '', rates: defaultRates });
  };

  const removeClient = (id: string) => {
    if (confirm('Permanently delete client records? This cannot be undone.')) {
      onUpdate(clients.filter(c => c.id !== id));
    }
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search NDIS client directory..."
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-mistTeal/10 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto px-8 py-4 bg-mistTeal text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-mistTeal/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={22} /> Register New NDIS Client
        </button>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(client => (
          <div key={client.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1">
             <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => setEditingClient(client)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-mistTeal hover:text-white rounded-2xl transition-all shadow-sm">
                <Edit3 size={18} />
              </button>
              <button onClick={() => removeClient(client.id)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-mistTeal/10 dark:bg-white/5 flex items-center justify-center text-mistTeal dark:text-white font-black text-2xl">
                {client.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-xl tracking-tight text-mistNavy dark:text-white">{client.name}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CLIENT ID: {client.id.slice(-6)}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl space-y-4 mb-8">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-400">Standard Rate</span>
                <span className="text-mistNavy dark:text-white">${client.rates.day}/hr</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-400">Weekend (Sat)</span>
                <span className="text-mistNavy dark:text-white">${client.rates.saturday}/hr</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-400">Travel/KM Rate</span>
                <span className="text-mistTeal">${client.rates.km}/km</span>
              </div>
            </div>

            <button onClick={() => setEditingClient(client)} className="w-full py-4 text-xs font-black uppercase tracking-widest text-mistTeal border-2 border-mistTeal/10 rounded-2xl hover:bg-mistTeal hover:text-white hover:border-mistTeal transition-all flex items-center justify-center gap-2">
              <CreditCard size={14} /> View Service Schedule
            </button>
          </div>
        ))}
      </div>

      {/* Modals for Add/Edit */}
      {(isAdding || editingClient) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-mistNavy/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-mistTeal text-white rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{isAdding ? 'Register NDIS Client' : 'Update Client Portfolio'}</h3>
                  <p className="text-xs text-slate-500 font-medium">Manage service rates and legal profiles</p>
                </div>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingClient(null); }} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isAdding ? handleAddSubmit : handleEditSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Client Legal Name</label>
                <input 
                  required
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent focus:border-mistTeal outline-none transition-all font-medium"
                  placeholder="Full name as per NDIS plan"
                  value={isAdding ? formData.name : editingClient?.name}
                  onChange={e => isAdding ? setFormData({...formData, name: e.target.value}) : setEditingClient({...editingClient!, name: e.target.value})}
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-mistTeal rounded-full"></div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">NDIS Service Rates ($ Hourly)</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {Object.keys(defaultRates).map((key) => (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block truncate">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={14} />
                        <input 
                          type="number"
                          step="0.01"
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-mistTeal outline-none text-sm font-bold"
                          value={isAdding ? (formData.rates as any)[key] : (editingClient?.rates as any)[key]}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (isAdding) {
                              setFormData({...formData, rates: { ...formData.rates as Rates, [key]: val }});
                            } else {
                              setEditingClient({...editingClient!, rates: { ...editingClient!.rates, [key]: val }});
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => { setIsAdding(false); setEditingClient(null); }} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="px-10 py-4 bg-mistTeal text-white rounded-2xl font-black shadow-lg shadow-mistTeal/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                  <Save size={20} /> {isAdding ? 'Register Client' : 'Update Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
