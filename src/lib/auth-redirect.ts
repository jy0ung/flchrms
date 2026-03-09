type RouteTarget = {
  pathname: string;
  search?: string;
  hash?: string;
};

type AuthRedirectState = {
  from?: RouteTarget | null;
} | null | undefined;

export const DEFAULT_POST_AUTH_TARGET = '/dashboard';

function serializeRouteTarget(target: RouteTarget) {
  return `${target.pathname}${target.search ?? ''}${target.hash ?? ''}`;
}

function isSafeRedirectTarget(target: string | null) {
  return !!target && /^\/(?!\/)/.test(target);
}

export function buildAuthRedirectHref(target: RouteTarget) {
  const redirect = serializeRouteTarget(target);
  const params = new URLSearchParams({ redirect });
  return `/auth?${params.toString()}`;
}

export function resolvePostAuthTarget({
  state,
  search,
  fallback = DEFAULT_POST_AUTH_TARGET,
}: {
  state?: AuthRedirectState;
  search?: string;
  fallback?: string;
}) {
  if (state?.from?.pathname && state.from.pathname !== '/auth') {
    return serializeRouteTarget(state.from);
  }

  const redirect = new URLSearchParams(search ?? '').get('redirect');
  if (isSafeRedirectTarget(redirect)) {
    return redirect;
  }

  return fallback;
}
