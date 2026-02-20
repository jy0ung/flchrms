const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeToDay(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function calculateWorkingDays(start: Date | string, end: Date | string) {
  const startDate = normalizeToDay(start);
  const endDate = normalizeToDay(end);

  if (startDate > endDate) {
    return 0;
  }

  let days = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      days += 1;
    }
  }

  return days;
}

export function calculateOverlappingLeaveDays(
  periodStart: Date | string,
  periodEnd: Date | string,
  leaveStart: Date | string,
  leaveEnd: Date | string,
) {
  const periodStartDate = normalizeToDay(periodStart);
  const periodEndDate = normalizeToDay(periodEnd);
  const leaveStartDate = normalizeToDay(leaveStart);
  const leaveEndDate = normalizeToDay(leaveEnd);

  const overlapStart = new Date(Math.max(periodStartDate.getTime(), leaveStartDate.getTime()));
  const overlapEnd = new Date(Math.min(periodEndDate.getTime(), leaveEndDate.getTime()));

  if (overlapStart > overlapEnd) {
    return 0;
  }

  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / DAY_IN_MS) + 1;
}
