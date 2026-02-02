
import React, { useState } from 'react';
import { Staff } from '../types';
import { STAFF_ROLES } from '../constants';
import { Plus, Search, Trash2, Edit3, Mail, Phone, Calendar, X, Save, UserCheck } from 'lucide-react';

interface StaffManagementProps {
  staff: Staff[];
  onUpdate: (staff: Staff[]) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '', role: 'support-worker', email: '', phone: '', startDate: new Date().toISOString().split('T')[0], active: true
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const item: Staff = { ...formData as Staff, id: Date.now().toString() };
    onUpdate([...staff, item]);
    resetForm();
    setIsAdding(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const updated = staff.map(s => s.id === editingStaff.id ? { ...editingStaff } : s);
    onUpdate(updated);
    setEditingStaff(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      onUpdate(staff.filter(s => s.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', role: 'support-worker', email: '', phone: '', startDate: new Date().toISOString().split('T')[0], active: true });
  };

  const filtered = staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search support workers..."
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-mistTeal/10 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto px-8 py-4 bg-mistNavy text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl"
        >
          <Plus size={22} /> Onboard Support Worker
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(member => (
          <div key={member.id} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative group transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 p-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingStaff(member)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl hover:bg-mistTeal hover:text-white transition-all">
                <Edit3 size={18} />
              </button>
              <button onClick={() => handleDelete(member.id)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl hover:bg-danger hover:text-white transition-all">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex items-center gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-mistNavy/10 dark:bg-white/5 flex items-center justify-center text-mistNavy dark:text-white font-black text-2xl">
                {member.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-xl text-mistNavy dark:text-white">{member.name}</h4>
                <p className="text-xs font-bold text-mistTeal uppercase tracking-wider mt-0.5">
                  {STAFF_ROLES.find(r => r.id === member.role)?.name || member.role}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                <Mail size={16} className="text-slate-400" /> {member.email || 'No email'}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                <Phone size={16} className="text-slate-400" /> {member.phone || 'No phone'}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                <Calendar size={16} className="text-slate-400" /> Joined {member.startDate}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest ${member.active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-400'}`}>
                {member.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <button onClick={() => setEditingStaff(member)} className="text-xs font-bold text-mistTeal uppercase">Update Record</button>
            </div>
          </div>
        ))}
      </div>

      {(isAdding || editingStaff) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-mistNavy/40 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-mistNavy text-white rounded-2xl flex items-center justify-center">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{isAdding ? 'Worker Onboarding' : 'Modify Record'}</h3>
                  <p className="text-xs text-slate-500 font-medium">Support Worker Administration</p>
                </div>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingStaff(null); }}><X size={20} /></button>
            </div>

            <form onSubmit={isAdding ? handleAddSubmit : handleEditSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input
                    required
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none"
                    value={isAdding ? formData.name : editingStaff?.name}
                    onChange={e => isAdding ? setFormData({...formData, name: e.target.value}) : setEditingStaff({...editingStaff!, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                  <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none appearance-none"
                    value={isAdding ? formData.role : editingStaff?.role}
                    onChange={e => isAdding ? setFormData({...formData, role: e.target.value}) : setEditingStaff({...editingStaff!, role: e.target.value})}
                  >
                    {STAFF_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none"
                    value={isAdding ? formData.email : editingStaff?.email}
                    onChange={e => isAdding ? setFormData({...formData, email: e.target.value}) : setEditingStaff({...editingStaff!, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none"
                    value={isAdding ? formData.phone : editingStaff?.phone}
                    onChange={e => isAdding ? setFormData({...formData, phone: e.target.value}) : setEditingStaff({...editingStaff!, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none"
                    value={isAdding ? formData.startDate : editingStaff?.startDate}
                    onChange={e => isAdding ? setFormData({...formData, startDate: e.target.value}) : setEditingStaff({...editingStaff!, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-mistTeal outline-none appearance-none"
                    value={isAdding ? (formData.active ? 'active' : 'inactive') : (editingStaff?.active ? 'active' : 'inactive')}
                    onChange={e => {
                      const isActive = e.target.value === 'active';
                      isAdding ? setFormData({...formData, active: isActive}) : setEditingStaff({...editingStaff!, active: isActive});
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => { setIsAdding(false); setEditingStaff(null); }} className="px-8 py-4 text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="px-10 py-4 bg-mistNavy text-white rounded-2xl font-black shadow-lg flex items-center gap-2">
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
