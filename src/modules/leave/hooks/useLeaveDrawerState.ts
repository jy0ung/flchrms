import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { LeaveRequest } from '@/types/hrms';

import type { LeaveDrawerState, LeaveDrawerTab } from '@/modules/leave/types';

const VALID_TABS: LeaveDrawerTab[] = ['request', 'balance', 'approval', 'cancellation', 'documents'];

function isLeaveDrawerTab(value: string | null): value is LeaveDrawerTab {
  return value !== null && VALID_TABS.includes(value as LeaveDrawerTab);
}

interface UseLeaveDrawerStateOptions {
  requests: LeaveRequest[];
  loading: boolean;
}

export function useLeaveDrawerState({ requests, loading }: UseLeaveDrawerStateOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get('requestId');
  const rawTab = searchParams.get('tab');
  const tab: LeaveDrawerTab = isLeaveDrawerTab(rawTab) ? rawTab : 'request';

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === requestId) ?? null,
    [requestId, requests],
  );

  const updateParams = useCallback((updater: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    updater(next);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const openRequest = useCallback((nextRequestId: string, nextTab: LeaveDrawerTab = 'request') => {
    updateParams((next) => {
      next.set('requestId', nextRequestId);
      next.set('tab', nextTab);
    });
  }, [updateParams]);

  const closeDrawer = useCallback(() => {
    updateParams((next) => {
      next.delete('requestId');
      next.delete('tab');
    });
  }, [updateParams]);

  const setTab = useCallback((nextTab: LeaveDrawerTab) => {
    if (!requestId) return;
    updateParams((next) => {
      next.set('requestId', requestId);
      next.set('tab', nextTab);
    });
  }, [requestId, updateParams]);

  const drawerState: LeaveDrawerState = {
    requestId,
    tab,
  };

  return {
    drawerState,
    selectedRequest,
    openRequest,
    closeDrawer,
    setTab,
    isDrawerOpen: Boolean(requestId),
    isUnavailable: Boolean(requestId) && !loading && !selectedRequest,
  };
}
