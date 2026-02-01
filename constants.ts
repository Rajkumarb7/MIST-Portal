
import { UserRole } from './types';

export const AUTH_CONFIG = {
  [UserRole.MANAGER]: 'benjo234',
  [UserRole.STAFF]: 'tubgg234',
  [UserRole.CLIENT]: 'dmjfou234'
};

export const SERVICE_TYPES = [
  { id: 'mental-health', name: 'Mental Health Support', icon: '🧠' },
  { id: 'recovery-coach', name: 'Psychosocial Recovery', icon: '🌱' },
  { id: 'mentoring', name: 'Youth Mentoring', icon: '🤝' },
  { id: 'outreach', name: 'Outreach Support', icon: '📍' },
  { id: 'sil-care', name: 'SIL Core Care', icon: '🏠' }
];

export const SHIFT_TYPES = [
  { id: 'day', name: 'Day Shift (Standard)', icon: '☀️' },
  { id: 'evening', name: 'Afternoon / Evening', icon: '🌆' },
  { id: 'night', name: 'Overnight Active', icon: '🌙' }
];

export const STAFF_ROLES = [
  { id: 'support-worker', name: 'Support Worker' },
  { id: 'senior-worker', name: 'Senior Practitioner' },
  { id: 'recovery-coach', name: 'Recovery Coach' },
  { id: 'team-leader', name: 'Area Team Leader' }
];
