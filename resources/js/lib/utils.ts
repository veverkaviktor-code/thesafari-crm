import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format phone number to +420 xxx xxx xxx or +421 xxx xxx xxx.
 * Accepts various inputs: 608713793, +420608713793, 420 608 713 793, etc.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return phone;

  let prefix: string;
  let number: string;

  if (digits.startsWith('421')) {
    prefix = '+421';
    number = digits.slice(3);
  } else if (digits.startsWith('420')) {
    prefix = '+420';
    number = digits.slice(3);
  } else if (digits.length === 9) {
    prefix = '+420';
    number = digits;
  } else {
    // Unknown format, return with spaces
    return phone;
  }

  if (number.length !== 9) return phone;

  return `${prefix} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 9)}`;
}

export function formatCurrency(amount: number | string | null | undefined): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

export function formatDate(d: string): string {
    return new Date(d).toLocaleDateString('cs-CZ');
}

export function formatRelativeTime(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Právě teď';
    if (minutes < 60) return `Před ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Před ${hours} hod`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Včera';
    return `Před ${days} ${days < 5 ? 'dny' : 'dny'}`;
}

export function formatHoursMinutes(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
