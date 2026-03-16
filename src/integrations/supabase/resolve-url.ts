export function resolveSupabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) return rawUrl;

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  if (rawUrl.startsWith('/')) {
    if (typeof window === 'undefined') {
      throw new Error(`Relative VITE_SUPABASE_URL requires a browser context. Got: ${rawUrl}`);
    }

    return `${window.location.origin}${rawUrl}`;
  }

  return rawUrl;
}
