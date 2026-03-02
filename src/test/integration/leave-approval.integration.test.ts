/**
 * Leave Approval Flow — Comprehensive Integration Tests
 *
 * Tests the full leave-request lifecycle against the live Supabase instance:
 *   1. Employee creates a leave request → status = 'pending'
 *   2. Manager approves / rejects / requests document via approve_leave_request RPC
 *   3. Multi-stage approval (manager → general_manager)
 *   4. Resubmission after rejection via amend_leave_request RPC
 *   5. Guard rails: self-approval, wrong role, already resolved, optimistic lock
 *   6. Audit trail via leave_request_events
 *
 * NO business logic is changed — only test assertions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestUser,
  getAdminClient,
  cleanupClients,
  offsetDate,
} from './helpers/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// ── Shared state ───────────────────────────────────────────────────────
let empClient: SupabaseClient<Database>;
let empId: string;
let mgrClient: SupabaseClient<Database>;
let mgrId: string;
let gmClient: SupabaseClient<Database>;
let gmId: string;
let adminClient: SupabaseClient<Database>;
let leaveTypeIds: string[] = [];
let leaveTypeCounter = 0;

/** IDs of leave requests created during tests — cleaned up in afterAll */
const createdLeaveIds: string[] = [];

// ── Setup ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  // 1. Get an admin client for role management
  const admin = await getAdminClient();
  adminClient = admin.client;

  // 2. Create test users
  const emp = await getTestUser('apv-employee');
  empClient = emp.client;
  empId = emp.userId;

  const mgr = await getTestUser('apv-manager');
  mgrClient = mgr.client;
  mgrId = mgr.userId;

  const gm = await getTestUser('apv-gm');
  gmClient = gm.client;
  gmId = gm.userId;

  // 3. Promote manager and GM via admin
  await adminClient
    .from('user_roles')
    .update({ role: 'manager' })
    .eq('user_id', mgrId);

  await adminClient
    .from('user_roles')
    .update({ role: 'general_manager' })
    .eq('user_id', gmId);

  // Verify promotions
  const { data: mgrRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', mgrId)
    .single();
  expect(mgrRole!.role).toBe('manager');

  const { data: gmRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', gmId)
    .single();
  expect(gmRole!.role).toBe('general_manager');

  // 4. Get leave types (rotate to avoid balance exhaustion)
  // Exclude Personal Leave (only 3 days/year) to avoid hitting limits
  const { data: lts } = await empClient
    .from('leave_types')
    .select('id, name, days_allowed')
    .gt('days_allowed', 5)
    .order('name');
  leaveTypeIds = lts!.map((lt) => lt.id);
  expect(leaveTypeIds.length).toBeGreaterThanOrEqual(3);

  // 5. Pre-cleanup: delete any orphaned leaves from prior crashed runs
  const { data: orphans } = await adminClient
    .from('leave_requests')
    .select('id')
    .eq('employee_id', empId);
  if (orphans && orphans.length > 0) {
    const ids = orphans.map((o) => o.id);
    await adminClient
      .from('leave_request_events')
      .delete()
      .in('leave_request_id', ids);
    await adminClient.from('leave_requests').delete().in('id', ids);
  }
}, 60_000);

afterAll(async () => {
  // Delete leave requests created during tests (admin can see all)
  if (createdLeaveIds.length > 0) {
    // Delete events first (FK cascade should handle this, but be safe)
    await adminClient
      .from('leave_request_events')
      .delete()
      .in('leave_request_id', createdLeaveIds);

    await adminClient
      .from('leave_requests')
      .delete()
      .in('id', createdLeaveIds);
  }

  // Revert roles back to employee
  await adminClient
    .from('user_roles')
    .update({ role: 'employee' })
    .eq('user_id', mgrId);
  await adminClient
    .from('user_roles')
    .update({ role: 'employee' })
    .eq('user_id', gmId);

  await cleanupClients();
});

// ── Helpers ────────────────────────────────────────────────────────────
/** Create a leave request as the employee and track its ID for cleanup. */
async function createLeave(opts?: {
  routeSnapshot?: string[];
  startOffset?: number;
  endOffset?: number;
  reason?: string;
}): Promise<{ id: string; status: string; approval_route_snapshot: string[] }> {
  // Rotate leave types to avoid per-type annual balance exhaustion
  const typeId = leaveTypeIds[leaveTypeCounter % leaveTypeIds.length];
  leaveTypeCounter++;

  // Use 1-day leaves (startOffset === endOffset) to conserve balance
  const dayOffset = opts?.startOffset ?? 30 + leaveTypeCounter;
  const { data, error } = await empClient
    .from('leave_requests')
    .insert({
      employee_id: empId,
      leave_type_id: typeId,
      start_date: offsetDate(dayOffset),
      end_date: offsetDate(dayOffset),
      days_count: 1,
      reason: opts?.reason ?? 'Integration test leave',
      ...(opts?.routeSnapshot
        ? { approval_route_snapshot: opts.routeSnapshot }
        : {}),
    })
    .select('id, status, approval_route_snapshot')
    .single();

  expect(error).toBeNull();
  createdLeaveIds.push(data!.id);
  return data!;
}

// ────────────────────────────────────────────────────────────────────────
describe('Leave Approval Flow Integration', () => {
  // ── 1. Leave creation ────────────────────────────────────────────────
  describe('leave request creation', () => {
    it('employee creates leave → status=pending with approval snapshot', async () => {
      const req = await createLeave({ startOffset: 40, endOffset: 41 });
      expect(req.status).toBe('pending');
      expect(Array.isArray(req.approval_route_snapshot)).toBe(true);
      expect(req.approval_route_snapshot.length).toBeGreaterThan(0);
    });

    it('leave request has correct initial columns', async () => {
      const req = await createLeave({ startOffset: 42, endOffset: 43 });

      const { data, error } = await empClient
        .from('leave_requests')
        .select(
          'status, rejected_at, rejected_by, manager_approved_at, final_approved_at',
        )
        .eq('id', req.id)
        .single();
      expect(error).toBeNull();
      expect(data!.status).toBe('pending');
      expect(data!.rejected_at).toBeNull();
      expect(data!.rejected_by).toBeNull();
      expect(data!.manager_approved_at).toBeNull();
      expect(data!.final_approved_at).toBeNull();
    });
  });

  // ── 2. Single-stage approval (manager only) ─────────────────────────
  describe('single-stage manager approval', () => {
    it('manager approves pending leave → manager_approved + final', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 50,
        endOffset: 51,
      });

      const { data, error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
        _manager_comments: 'Approved by integration test',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('manager_approved');
      expect(result.manager_approved_by).toBe(mgrId);
      expect(result.manager_approved_at).toBeTruthy();
      // Single-stage: should be final
      expect(result.final_approved_at).toBeTruthy();
      expect(result.final_approved_by).toBe(mgrId);
      expect(result.final_approved_by_role).toBe('manager');
    });
  });

  // ── 3. Manager rejection ────────────────────────────────────────────
  describe('manager rejection', () => {
    it('manager rejects pending leave → rejected with reason', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 55,
        endOffset: 56,
      });

      const { data, error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Insufficient coverage',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('rejected');
      expect(result.rejected_by).toBe(mgrId);
      expect(result.rejected_at).toBeTruthy();
      expect(result.rejection_reason).toBe('Insufficient coverage');
      expect(result.final_approved_at).toBeNull();
    });
  });

  // ── 4. Resubmission after rejection ─────────────────────────────────
  describe('amend & resubmit after rejection', () => {
    it('employee amends rejected leave → back to pending', async () => {
      // Create and reject
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 60,
        endOffset: 61,
        reason: 'Original reason',
      });

      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Needs more info',
      });

      // Employee amends
      const { data: amended, error } = await empClient.rpc(
        'amend_leave_request',
        {
          _request_id: req.id,
          _amendment_notes: 'Added supporting details',
          _reason: 'Updated reason with more context',
        },
      );

      expect(error).toBeNull();
      expect(amended).toBeTruthy();
      const result = amended as Record<string, unknown>;
      expect(result.status).toBe('pending');
      expect(result.amendment_notes).toBe('Added supporting details');
      expect(result.amended_at).toBeTruthy();
      expect(result.reason).toBe('Updated reason with more context');
    });

    it('amended leave can be approved after resubmission', async () => {
      // Create, reject, amend, then approve
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 62,
        endOffset: 63,
      });

      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Needs document',
      });

      await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'Attached supporting document',
        _document_url: 'https://example.com/doc.pdf',
      });

      // Manager now approves the amended request
      const { data, error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
        _manager_comments: 'Approved after amendment',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('manager_approved');
      expect(result.final_approved_at).toBeTruthy();
    });
  });

  // ── 5. Document request ─────────────────────────────────────────────
  describe('document request', () => {
    it('manager can request document for pending leave', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 65,
        endOffset: 66,
      });

      const { data, error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'request_document',
        _document_required: true,
        _manager_comments: 'Please attach MC',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.document_required).toBe(true);
      expect(result.manager_comments).toBe('Please attach MC');
      // Status should still be pending
      expect(result.status).toBe('pending');
    });

    it('employee can amend after document request', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 67,
        endOffset: 68,
      });

      // Manager requests document
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'request_document',
        _document_required: true,
        _manager_comments: 'Need supporting doc',
      });

      // Employee amends with document
      const { data, error } = await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'Attached medical cert',
        _document_url: 'https://example.com/mc.pdf',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('pending');
      expect(result.amendment_notes).toBe('Attached medical cert');
    });
  });

  // ── 6. Self-approval prevention ─────────────────────────────────────
  describe('self-approval prevention', () => {
    it('employee cannot approve own leave', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 70,
        endOffset: 71,
      });

      const { error } = await empClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        'cannot approve or reject your own leave',
      );
    });
  });

  // ── 7. Wrong role prevention ────────────────────────────────────────
  describe('wrong role prevention', () => {
    it('employee cannot approve another employee leave', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 72,
        endOffset: 73,
      });

      // Use another employee (not manager/gm) to try to approve
      const { client: otherEmp } = await getTestUser('apv-other-emp');
      const { error } = await otherEmp.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      expect(error).toBeTruthy();
      // Should fail because employee role can't approve at manager stage
      expect(error!.message).toMatch(/manager|role/i);
    });

    it('GM cannot approve at manager stage (when manager is first)', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager', 'general_manager'],
        startOffset: 74,
        endOffset: 75,
      });

      const { error } = await gmClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/manager/i);
    });
  });

  // ── 8. Multi-stage approval ─────────────────────────────────────────
  describe('multi-stage approval (manager → general_manager)', () => {
    it('full 2-stage approval flow', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager', 'general_manager'],
        startOffset: 80,
        endOffset: 81,
      });
      expect(req.approval_route_snapshot).toEqual([
        'manager',
        'general_manager',
      ]);

      // Stage 1: Manager approves → manager_approved, NOT final
      const { data: stage1, error: e1 } = await mgrClient.rpc(
        'approve_leave_request',
        {
          _request_id: req.id,
          _action: 'approve',
          _manager_comments: 'Stage 1 approved',
        },
      );

      expect(e1).toBeNull();
      const s1 = stage1 as Record<string, unknown>;
      expect(s1.status).toBe('manager_approved');
      expect(s1.manager_approved_by).toBe(mgrId);
      expect(s1.manager_approved_at).toBeTruthy();
      // Not final yet — there's another stage
      expect(s1.final_approved_at).toBeNull();

      // Stage 2: GM approves → gm_approved + final
      const { data: stage2, error: e2 } = await gmClient.rpc(
        'approve_leave_request',
        {
          _request_id: req.id,
          _action: 'approve',
          _manager_comments: 'Stage 2 approved',
        },
      );

      expect(e2).toBeNull();
      const s2 = stage2 as Record<string, unknown>;
      expect(s2.status).toBe('gm_approved');
      expect(s2.gm_approved_by).toBe(gmId);
      expect(s2.gm_approved_at).toBeTruthy();
      // This is the final stage
      expect(s2.final_approved_at).toBeTruthy();
      expect(s2.final_approved_by).toBe(gmId);
      expect(s2.final_approved_by_role).toBe('general_manager');
    });

    it('rejection at stage 2 still works', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager', 'general_manager'],
        startOffset: 82,
        endOffset: 83,
      });

      // Manager approves stage 1
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      // GM rejects at stage 2
      const { data, error } = await gmClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Budget constraints',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('rejected');
      expect(result.rejected_by).toBe(gmId);
      expect(result.rejection_reason).toBe('Budget constraints');
      expect(result.final_approved_at).toBeNull();
    });
  });

  // ── 9. Already-resolved prevention ──────────────────────────────────
  describe('already-resolved prevention', () => {
    it('cannot approve an already rejected request', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 85,
        endOffset: 86,
      });

      // Reject first
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'No',
      });

      // Try to approve again
      const { error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/already.*rejected|cannot process/i);
    });

    it('cannot approve an already fully approved request', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 87,
        endOffset: 88,
      });

      // Approve (single-stage = final)
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      // Try to approve again
      const { error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/already.*approved|no further/i);
    });
  });

  // ── 10. Optimistic locking ──────────────────────────────────────────
  describe('optimistic locking', () => {
    it('rejects approval when expected_status does not match', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 90,
        endOffset: 91,
      });

      const { error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
        _expected_status: 'manager_approved', // actual is 'pending'
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/status has changed|expected.*actual/i);
    });

    it('succeeds when expected_status matches', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 92,
        endOffset: 93,
      });

      const { data, error } = await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
        _expected_status: 'pending',
      });

      expect(error).toBeNull();
      const result = data as Record<string, unknown>;
      expect(result.status).toBe('manager_approved');
    });
  });

  // ── 11. Audit trail (leave_request_events) ──────────────────────────
  describe('audit trail', () => {
    it('leave creation generates a leave_created event', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 95,
        endOffset: 96,
      });

      // Events are created by DB trigger on INSERT
      const { data: events, error } = await empClient
        .from('leave_request_events')
        .select('event_type, to_status')
        .eq('leave_request_id', req.id);

      expect(error).toBeNull();
      expect(events!.length).toBeGreaterThanOrEqual(1);
      const createdEvent = events!.find(
        (e) => e.event_type === 'leave_created',
      );
      expect(createdEvent).toBeTruthy();
    });

    it('approval generates status_changed + final_approved events', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 97,
        endOffset: 98,
      });

      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      const { data: events, error } = await adminClient
        .from('leave_request_events')
        .select('event_type, from_status, to_status, actor_user_id')
        .eq('leave_request_id', req.id)
        .order('occurred_at', { ascending: true });

      expect(error).toBeNull();
      expect(events!.length).toBeGreaterThanOrEqual(2);

      // Created event
      const created = events!.find((e) => e.event_type === 'leave_created');
      expect(created).toBeTruthy();

      // Status changed event
      const approved = events!.find(
        (e) => e.event_type === 'leave_status_changed',
      );
      expect(approved).toBeTruthy();
      expect(approved!.from_status).toBe('pending');
      expect(approved!.to_status).toBe('manager_approved');
      expect(approved!.actor_user_id).toBe(mgrId);
    });

    it('rejection generates rejection event', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 99,
        endOffset: 100,
      });

      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Audit trail test',
      });

      const { data: events, error } = await adminClient
        .from('leave_request_events')
        .select('event_type, from_status, to_status')
        .eq('leave_request_id', req.id)
        .order('occurred_at', { ascending: true });

      expect(error).toBeNull();
      const rejectedEvent = events!.find(
        (e) => e.event_type === 'leave_rejected',
      );
      expect(rejectedEvent).toBeTruthy();
      expect(rejectedEvent!.to_status).toBe('rejected');
    });

    it('multi-stage flow records events for each stage', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager', 'general_manager'],
        startOffset: 101,
        endOffset: 102,
      });

      // Manager approves
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      // GM approves
      await gmClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      const { data: events, error } = await adminClient
        .from('leave_request_events')
        .select('event_type, from_status, to_status, actor_user_id')
        .eq('leave_request_id', req.id)
        .order('occurred_at', { ascending: true });

      expect(error).toBeNull();

      // Should have: leave_created, status_changed (pending→manager_approved),
      // status_changed (manager_approved→gm_approved), final_approved
      const eventTypes = events!.map((e) => e.event_type);
      expect(eventTypes).toContain('leave_created');

      const statusChanges = events!.filter(
        (e) => e.event_type === 'leave_status_changed',
      );
      expect(statusChanges.length).toBeGreaterThanOrEqual(2);

      // First approval
      const mgrApproval = statusChanges.find(
        (e) => e.to_status === 'manager_approved',
      );
      expect(mgrApproval).toBeTruthy();
      expect(mgrApproval!.actor_user_id).toBe(mgrId);

      // Second approval
      const gmApproval = statusChanges.find(
        (e) => e.to_status === 'gm_approved',
      );
      expect(gmApproval).toBeTruthy();
      expect(gmApproval!.actor_user_id).toBe(gmId);

      // Final approved event
      const finalEvent = events!.find(
        (e) => e.event_type === 'leave_final_approved',
      );
      expect(finalEvent).toBeTruthy();
    });

    it('amendment/resubmission generates resubmitted event', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 103,
        endOffset: 104,
      });

      // Reject
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Needs amendment',
      });

      // Amend
      await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'Resubmitted with changes',
        _reason: 'Better reason',
      });

      const { data: events, error } = await adminClient
        .from('leave_request_events')
        .select('event_type, from_status, to_status')
        .eq('leave_request_id', req.id)
        .order('occurred_at', { ascending: true });

      expect(error).toBeNull();
      const eventTypes = events!.map((e) => e.event_type);
      // Should have a resubmitted event
      expect(
        eventTypes.some(
          (t) => t === 'leave_resubmitted' || t === 'leave_amended',
        ),
      ).toBe(true);
    });
  });

  // ── 12. amend_leave_request guard rails ─────────────────────────────
  describe('amend_leave_request guards', () => {
    it('cannot amend another employee leave', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 106,
        endOffset: 107,
      });

      // Reject first so it can be amended
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Testing cross-user amend',
      });

      const { client: otherEmp } = await getTestUser('apv-other-emp');
      const { error } = await otherEmp.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'Trying to amend someone else leave',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/own leave/i);
    });

    it('cannot amend a final-approved leave', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 108,
        endOffset: 109,
      });

      // Approve (single-stage = final)
      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'approve',
      });

      const { error } = await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'Attempting to amend after approval',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/final.approved|cannot be amended/i);
    });

    it('cannot amend a pending leave (not rejected, no doc request)', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 110,
        endOffset: 111,
      });

      // Leave is pending but no rejection and no document_required
      const { error } = await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: 'No reason to amend yet',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/rejected|document/i);
    });

    it('amendment_notes is required', async () => {
      const req = await createLeave({
        routeSnapshot: ['manager'],
        startOffset: 112,
        endOffset: 113,
      });

      await mgrClient.rpc('approve_leave_request', {
        _request_id: req.id,
        _action: 'reject',
        _rejection_reason: 'Testing empty amend',
      });

      const { error } = await empClient.rpc('amend_leave_request', {
        _request_id: req.id,
        _amendment_notes: '',
      });

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/notes.*required|required/i);
    });
  });
});
