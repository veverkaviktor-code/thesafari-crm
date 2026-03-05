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
