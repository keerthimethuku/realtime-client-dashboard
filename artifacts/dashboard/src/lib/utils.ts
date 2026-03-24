import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'todo': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'in_review': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'done': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'on_hold': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'low': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
