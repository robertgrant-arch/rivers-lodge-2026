export function format12HourTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  if (!startTime && !endTime) return '';
  if (startTime && endTime) return `${format12HourTime(startTime)}–${format12HourTime(endTime)}`;
  if (startTime) return `from ${format12HourTime(startTime)}`;
  if (endTime) return `until ${format12HourTime(endTime)}`;
  return '';
}
