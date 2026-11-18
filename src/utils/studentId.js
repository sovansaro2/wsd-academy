/**
 * Generate a Student ID from a date of birth string ('YYYY-MM-DD').
 * Format: STU-{DD}{M}{YYY}
 * - DD: 2-digit day of month ('01'..'31')
 * - M: month number without leading zero ('1'..'12')
 * - YYY: last 3 digits of the 4-digit year (e.g. '2007' -> '007')
 *
 * Example: '2007-01-23' -> 'STU-231007'
 */
export function generateStudentIdFromDob(dob) {
  if (!dob || typeof dob !== 'string') return '';

  const parts = dob.trim().split('-');
  if (parts.length !== 3) return '';

  const yearNum = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  const dayNum = parseInt(parts[2], 10);

  if (
    Number.isNaN(yearNum) ||
    Number.isNaN(monthNum) ||
    Number.isNaN(dayNum) ||
    monthNum < 1 ||
    monthNum > 12 ||
    dayNum < 1 ||
    dayNum > 31
  ) {
    return '';
  }

  const dd = String(dayNum).padStart(2, '0');
  const m = String(monthNum);
  const yyy = String(yearNum).padStart(4, '0').slice(-3);

  return `STU-${dd}${m}${yyy}`;
}

/**
 * Pick the next available unique Student ID given a base ID and a Set of taken uppercase IDs.
 */
export function pickNextAvailableStudentId(baseId, takenUpperSet) {
  if (!baseId) return '';
  if (!takenUpperSet.has(baseId.toUpperCase())) {
    return baseId;
  }

  let suffix = 2;
  while (takenUpperSet.has(`${baseId}-${suffix}`.toUpperCase())) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}
