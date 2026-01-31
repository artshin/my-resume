/**
 * Formatting utilities
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const lower = dateStr.toLowerCase();
  if (lower === 'present' || lower === 'current') {
    return new Date();
  }

  // Try "Month Year" format
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    const monthIndex = MONTH_NAMES.findIndex(
      (m) => m.toLowerCase() === parts[0].toLowerCase()
    );
    const shortIndex = SHORT_MONTHS.findIndex(
      (m) => m.toLowerCase() === parts[0].toLowerCase()
    );
    const idx = monthIndex >= 0 ? monthIndex : shortIndex;

    if (idx >= 0) {
      const year = parseInt(parts[1], 10);
      if (!isNaN(year)) {
        return new Date(year, idx);
      }
    }
  }

  return null;
}

export function formatDateRange(start: string, end?: string): string {
  const endStr = end || 'Present';
  return `${start} - ${endStr}`;
}

export function formatDuration(start: string, end?: string): string {
  const startDate = parseDate(start);
  const endDate = end ? parseDate(end) : new Date();

  if (!startDate || !endDate) return '';

  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} mo`;
  }

  if (remainingMonths === 0) {
    return `${years} yr`;
  }

  return `${years} yr ${remainingMonths} mo`;
}

export function formatYearsExperience(years: number): string {
  if (years === 1) return '1 year';
  return `${years}+ years`;
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}
