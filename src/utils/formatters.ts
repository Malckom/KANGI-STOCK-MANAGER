/**
 * Formatting and date calculation utilities for KANGI Stock Manager
 */

export function formatKES(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'KSh 0';
  return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('en-KE');
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string | undefined): string {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = minutes || '00';
    if (isNaN(h)) return timeString;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeString;
  }
}

export function formatDateTime(dateString: string, timeString?: string): string {
  const formattedDate = formatDate(dateString);
  if (!timeString) return formattedDate;
  return `${formattedDate} at ${formatTime(timeString)}`;
}

/**
 * Checks if a follow-up is overdue
 * A follow up is overdue if scheduled date (and time) is strictly in the past
 * and status is NOT 'completed' and NOT 'cancelled'
 */
export function isFollowUpOverdue(dateString: string, timeString?: string, status?: string): boolean {
  if (status === 'completed' || status === 'cancelled') return false;
  if (!dateString) return false;

  const now = new Date();
  const followUpDate = new Date(dateString);

  if (timeString) {
    const [h, m] = timeString.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      followUpDate.setHours(h, m, 0, 0);
      return followUpDate.getTime() < now.getTime();
    }
  }

  // If no time, compare by end of scheduled day
  followUpDate.setHours(23, 59, 59, 999);
  return followUpDate.getTime() < now.getTime();
}

export function isDateToday(dateString: string): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

export function isDateTomorrow(dateString: string): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  );
}

export function isDateThisWeek(dateString: string): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday

  return target >= startOfWeek && target < endOfWeek;
}

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayString(): string {
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const y = yest.getFullYear();
  const m = String(yest.getMonth() + 1).padStart(2, '0');
  const d = String(yest.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
