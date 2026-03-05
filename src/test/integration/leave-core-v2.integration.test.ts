import { afterAll, describe, expect, it } from 'vitest';
import { cleanupClients, getTestUser, offsetDate } from './helpers/supabase-test-client';

type LeavePreviewPayload = {
  can_submit?: boolean;
  requested_units?: number;
  hard_errors?: string[];
};

type LeaveSubmitPayload = {
  request_id?: string;
};

type LeaveRequestV2Payload = {
  request?: {
    id?: string;
  };
  decisions?: unknown[];
};

describe('Leave Core V2 Integration', () => {
  const createdRequestIds: string[] = [];

  afterAll(async () => {
    const { client, userId } = await getTestUser('leave-core-v2-main');
    for (const requestId of createdRequestIds) {
      await client.from('leave_requests').delete().eq('id', requestId).eq('employee_id', userId);
    }
    await cleanupClients();
  });

  it('employee can preview and submit leave request via v2 RPC', async () => {
    const { client, userId } = await getTestUser('leave-core-v2-main');

    const { data: balanceRows, error: balanceError } = await client.rpc('leave_get_my_balance_v2', {
      _as_of: null,
    });
    expect(balanceError).toBeNull();

    const balanceCandidate = Array.isArray(balanceRows)
      ? balanceRows.find((row) => {
          const payload = row as { leave_type_id?: unknown; available?: unknown };
          return typeof payload.leave_type_id === 'string' && Number(payload.available ?? 0) >= 1;
        })
      : null;

    let leaveTypeId =
      balanceCandidate && typeof (balanceCandidate as { leave_type_id?: unknown }).leave_type_id === 'string'
        ? ((balanceCandidate as { leave_type_id: string }).leave_type_id)
        : null;

    if (!leaveTypeId) {
      const { data: leaveType, error: leaveTypeError } = await client
        .from('leave_types')
        .select('id')
        .limit(1)
        .single();
      expect(leaveTypeError).toBeNull();
      leaveTypeId = leaveType!.id;
    }

    const startDate = offsetDate(21);
    const endDate = startDate;

    const { data: previewDataRaw, error: previewError } = await client.rpc('leave_preview_request', {
      _employee_id: userId,
      _leave_type_id: leaveTypeId,
      _start_date: startDate,
      _end_date: endDate,
      _days_count: 1,
      _reason: 'Phase1 v2 preview integration test',
      _request_id: null,
    });

    expect(previewError).toBeNull();
    const previewData = (previewDataRaw ?? {}) as LeavePreviewPayload;
    expect(previewData.can_submit).toBe(true);
    expect(Number(previewData.requested_units ?? 0)).toBeGreaterThan(0);

    const { data: submitDataRaw, error: submitError } = await client.rpc('leave_submit_request_v2', {
      _leave_type_id: leaveTypeId,
      _start_date: startDate,
      _end_date: endDate,
      _days_count: 1,
      _reason: 'Phase1 v2 submit integration test',
      _document_url: null,
      _idempotency_key: null,
    });

    expect(submitError).toBeNull();
    const submitData = (submitDataRaw ?? {}) as LeaveSubmitPayload;
    expect(submitData.request_id).toBeTruthy();

    const requestId = submitData.request_id!;
    createdRequestIds.push(requestId);

    const { data: requestV2DataRaw, error: requestV2Error } = await client.rpc('leave_get_request_v2', {
      _request_id: requestId,
    });
    expect(requestV2Error).toBeNull();

    const requestV2Data = (requestV2DataRaw ?? {}) as LeaveRequestV2Payload;
    expect(requestV2Data.request?.id).toBe(requestId);
    expect(Array.isArray(requestV2Data.decisions)).toBe(true);
  });
});
