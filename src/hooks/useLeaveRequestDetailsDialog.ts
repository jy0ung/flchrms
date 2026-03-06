import { useCallback, useState } from 'react';

import type { LeaveRequest } from '@/types/hrms';

import { useLeaveRequestDetails } from '@/modules/leave/hooks/useLeaveRequestDetails';

export function useLeaveRequestDetailsDialog() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<LeaveRequest | null>(null);

  const {
    approvalTimelineEvents,
    cancellationTimelineEvents,
    eventsLoading,
    actorsLoading,
    getActorLabel,
  } = useLeaveRequestDetails({
    request,
    enabled: open && !!request,
  });

  const handleOpenDetails = useCallback(async (nextRequest: LeaveRequest) => {
    setRequest(nextRequest);
    setOpen(true);
  }, []);

  const handleDetailDialogOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setRequest(null);
    }
  }, []);

  return {
    detailDialogOpen: open,
    detailRequest: request,
    detailEventsLoading: eventsLoading,
    detailActorsLoading: actorsLoading,
    detailApprovalTimelineEvents: approvalTimelineEvents,
    detailCancellationTimelineEvents: cancellationTimelineEvents,
    getActorLabel,
    handleOpenDetails,
    handleDetailDialogOpenChange,
  };
}
