const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeToDay(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Calculates the number of working days between two dates (inclusive),
 * excluding weekends (Saturday & Sunday) and any provided holiday dates.
 *
 * @param holidays - Optional set of ISO date strings (YYYY-MM-DD) to exclude from
 *   the count. Fetch holidays with useHolidays() and pass their dates here.
 */
export function calculateWorkingDays(
  start: Date | string,
  end: Date | string,
  holidays?: ReadonlySet<string>,
) {
  const startDate = normalizeToDay(start);
  const endDate = normalizeToDay(end);

  if (startDate > endDate) {
    return 0;
  }

  let days = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    if (holidays) {
      const iso = cursor.toISOString().slice(0, 10);
      if (holidays.has(iso)) continue; // skip holidays
    }

    days += 1;
  }

  return days;
}

/**
 * Calculates the number of **working** days where a leave period overlaps
 * with a payroll period, excluding weekends and holidays.
 */
export function calculateOverlappingLeaveDays(
  periodStart: Date | string,
  periodEnd: Date | string,
  leaveStart: Date | string,
  leaveEnd: Date | string,
  holidays?: ReadonlySet<string>,
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

  // Count working days in the overlap range instead of calendar days
  return calculateWorkingDays(overlapStart, overlapEnd, holidays);
}
