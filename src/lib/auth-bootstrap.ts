import { retryAsync } from '@/lib/async-retry';

const TRANSIENT_AUTH_MESSAGES = [
  'failed to fetch',
  'load failed',
  'networkerror',
  'aborterror',
  'fetch failed',
];

function extractErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return '';
}

function extractErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return null;

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  return null;
}

export function isTransientAuthReadError(error: unknown) {
  const normalizedMessage = extractErrorMessage(error).toLowerCase();
  if (TRANSIENT_AUTH_MESSAGES.some((pattern) => normalizedMessage.includes(pattern))) {
    return true;
  }

  const status = extractErrorStatus(error);
  if (status === null) return false;

  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export async function withAuthReadRetry<T>(
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    delayMs?: number;
  },
) {
  return retryAsync(operation, {
    attempts: options?.attempts ?? 3,
    delayMs: options?.delayMs ?? 175,
    shouldRetry: isTransientAuthReadError,
  });
}
