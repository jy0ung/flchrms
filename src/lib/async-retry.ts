export interface RetryAsyncOptions {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    delayMs = 150,
    shouldRetry = () => true,
  }: RetryAsyncOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}
