import type { AnalyticsProvenanceTag } from '@null/domain';

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }

  return value.toFixed(1);
}

export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : String(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'No data';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return 'No data';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function provenanceLabel(tag: AnalyticsProvenanceTag): string {
  switch (tag) {
    case 'direct':
      return 'Direct';
    case 'estimated':
      return 'Estimated';
    case 'engagement':
      return 'Engagement';
    case 'awards':
      return 'Awards';
    case 'metadata':
      return 'Metadata';
    default:
      return tag;
  }
}

export function mergeSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>
): string {
  const next = new URLSearchParams(current.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  });

  const query = next.toString();
  return query ? `?${query}` : '';
}
