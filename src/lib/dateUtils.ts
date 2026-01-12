import { parseISO } from 'date-fns';

/**
 * Parse a date string with timezone awareness.
 * Handles various date formats:
 * - ISO 8601: "2024-01-15T10:30:00Z" or "2024-01-15T10:30:00.000Z"
 * - Date only: "2024-01-15" (parsed as local midnight, not UTC)
 * - Date with time: "2024-01-15T10:30" (local time)
 */
export function parseDate(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // If it's just a date (YYYY-MM-DD), parse as local time by adding time component
  // This prevents the off-by-one-day issue when the date is interpreted as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Add time component to force local timezone interpretation
    return parseISO(dateString + 'T00:00:00');
  }

  // For full ISO strings or datetime strings, use parseISO which handles timezone correctly
  return parseISO(dateString);
}

/**
 * Parse a date and time string combination into a Date object.
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format
 */
export function parseDateTime(date: string, time: string): Date {
  if (!date) {
    return new Date();
  }

  // Combine date and time, ensuring local timezone interpretation
  const timeComponent = time || '00:00';
  return parseISO(`${date}T${timeComponent}:00`);
}

/**
 * Safely format a date for display, with fallback for invalid dates.
 */
export function safeFormatDate(dateString: string, formatFn: (date: Date) => string, fallback = 'N/A'): string {
  try {
    const date = parseDate(dateString);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return formatFn(date);
  } catch {
    return fallback;
  }
}
