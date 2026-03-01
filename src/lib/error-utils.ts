/**
 * Sanitize error messages for user-facing display.
 *
 * Strips internal database details, SQL error codes, and stack traces
 * while preserving human-readable context from known business-rule
 * RAISE EXCEPTION messages.
 */

const INTERNAL_PATTERNS = [
  /violates\s+(check|foreign\s+key|unique|not-null)\s+constraint/i,
  /relation\s+"[^"]+"\s+does not exist/i,
  /column\s+"[^"]+"\s+(does not exist|of\s+relation)/i,
  /permission\s+denied\s+for\s+(table|schema|function)/i,
  /duplicate\s+key\s+value\s+violates/i,
  /null\s+value\s+in\s+column/i,
  /syntax\s+error\s+at\s+or\s+near/i,
  /stack traceback/i,
  /pg_catalog\./i,
  /PGRST\d{3}/i,
];

/**
 * Returns a user-safe error description.  If the raw message looks like an
 * internal DB/API detail it is replaced with a generic fallback.
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!raw) return fallback;

  // If the message matches a known internal pattern, hide it.
  if (INTERNAL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return fallback;
  }

  // Cap length to prevent huge blobs from reaching the toast.
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}