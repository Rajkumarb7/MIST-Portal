
import { UserRole } from './types';

export const AUTH_CONFIG = {
  [UserRole.MANAGER]: 'benjo234',
  [UserRole.STAFF]: 'tubgg234',
  [UserRole.CLIENT]: 'dmjfou234'
};

export const SERVICE_TYPES = [
  { id: 'community-access', name: 'Community Access', icon: '🏘️' },
  { id: 'in-home-support', name: 'In-Home Support', icon: '🏠' },
  { id: 'sil-day', name: 'SIL Day', icon: '☀️' },
  { id: 'sil-night', name: 'SIL Night', icon: '🌙' },
  { id: 'mental-health', name: 'Mental Health Support', icon: '🧠' },
  { id: 'recovery-coach', name: 'Psychosocial Recovery', icon: '🌱' },
  { id: 'mentoring', name: 'Youth Mentoring', icon: '🤝' },
  { id: 'outreach', name: 'Outreach Support', icon: '📍' }
];

export const SHIFT_TYPES = [
  { id: 'day', name: 'Day Shift', icon: '☀️' },
  { id: 'evening', name: 'Evening Shift', icon: '🌆' },
  { id: 'night', name: 'Night Shift', icon: '🌙' }
];

export const STAFF_ROLES = [
  { id: 'support-worker', name: 'Support Worker' },
  { id: 'senior-worker', name: 'Senior Practitioner' },
  { id: 'recovery-coach', name: 'Recovery Coach' },
  { id: 'team-leader', name: 'Area Team Leader' }
];
