import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a string to proper title case with special handling for hyphens and apostrophes
 * Examples:
 * - "GARETH" → "Gareth"
 * - "gareth" → "Gareth"
 * - "MARY-JANE" → "Mary-Jane"
 * - "O'BRIEN" → "O'Brien"
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str
    .toLowerCase()
    .split(/(\s+|-|')/) // Split on spaces, hyphens, and apostrophes while preserving delimiters
    .map((part, index, parts) => {
      // Skip empty parts and delimiters
      if (!part || /^\s+$/.test(part) || part === '-' || part === "'") {
        return part;
      }

      // Handle special case for apostrophe words (O'Brien, D'Angelo)
      if (index > 0 && parts[index - 1] === "'") {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }

      // Regular title case
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}
