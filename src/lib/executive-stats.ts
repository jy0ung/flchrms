export const COMPLETED_REVIEW_STATUSES = ['submitted', 'acknowledged'] as const;

export function calculateAbsentEmployees(activeEmployees: number, presentEmployees: number, onLeaveEmployees: number) {
  return Math.max(0, activeEmployees - presentEmployees - onLeaveEmployees);
}
