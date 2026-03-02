import { describe, expect, it } from 'vitest';
import {
  normalizeStatusKey,
  getStatusMeta,
  getStatusRegistrySnapshot,
  type StatusMeta,
} from '@/lib/status-system';

// ── normalizeStatusKey ───────────────────────────────────────────
describe('normalizeStatusKey', () => {
  it('returns "info" for null', () => {
    expect(normalizeStatusKey(null)).toBe('info');
  });

  it('returns "info" for undefined', () => {
    expect(normalizeStatusKey(undefined)).toBe('info');
  });

  it('returns "info" for empty string', () => {
    expect(normalizeStatusKey('')).toBe('info');
  });

  it('lowercases and trims input', () => {
    expect(normalizeStatusKey('  PENDING  ')).toBe('pending');
  });

  it('replaces spaces with underscores', () => {
    expect(normalizeStatusKey('half day')).toBe('half_day');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeStatusKey('half   day')).toBe('half_day');
  });

  it('resolves alias "in_progress" → "processing"', () => {
    expect(normalizeStatusKey('in_progress')).toBe('processing');
  });

  it('resolves alias "inprogress" → "processing"', () => {
    expect(normalizeStatusKey('inprogress')).toBe('processing');
  });

  it('resolves alias "open" → "active"', () => {
    expect(normalizeStatusKey('open')).toBe('active');
  });

  it('resolves alias "closed" → "completed"', () => {
    expect(normalizeStatusKey('closed')).toBe('completed');
  });

  it('resolves alias "failed" → "error"', () => {
    expect(normalizeStatusKey('failed')).toBe('error');
  });

  it('resolves alias "terminated" → "inactive"', () => {
    expect(normalizeStatusKey('terminated')).toBe('inactive');
  });

  it('resolves alias "archived" → "inactive"', () => {
    expect(normalizeStatusKey('archived')).toBe('inactive');
  });

  it('resolves alias "published" → "active"', () => {
    expect(normalizeStatusKey('published')).toBe('active');
  });

  it('resolves alias "general_manager_approved" → "gm_approved"', () => {
    expect(normalizeStatusKey('general_manager_approved')).toBe('gm_approved');
  });

  it('passes through unknown keys unchanged', () => {
    expect(normalizeStatusKey('custom_status')).toBe('custom_status');
  });
});

// ── getStatusMeta ────────────────────────────────────────────────
describe('getStatusMeta', () => {
  it('returns correct meta for a registered key', () => {
    const meta = getStatusMeta('pending');
    expect(meta).toEqual<StatusMeta>({
      key: 'pending',
      label: 'Pending',
      tone: 'warning',
      iconKey: 'clock',
    });
  });

  it('returns correct meta for "approved"', () => {
    const meta = getStatusMeta('approved');
    expect(meta.label).toBe('Approved');
    expect(meta.tone).toBe('success');
    expect(meta.iconKey).toBe('check');
  });

  it('returns correct meta for "rejected"', () => {
    const meta = getStatusMeta('rejected');
    expect(meta.label).toBe('Rejected');
    expect(meta.tone).toBe('danger');
    expect(meta.iconKey).toBe('x');
  });

  it('returns correct meta for attendance statuses', () => {
    expect(getStatusMeta('present').tone).toBe('success');
    expect(getStatusMeta('absent').tone).toBe('danger');
    expect(getStatusMeta('late').tone).toBe('warning');
    expect(getStatusMeta('half_day').tone).toBe('info');
    expect(getStatusMeta('on_leave').tone).toBe('neutral');
  });

  it('resolves aliases before looking up', () => {
    const meta = getStatusMeta('in_progress');
    expect(meta.key).toBe('processing');
    expect(meta.label).toBe('Processing');
    expect(meta.tone).toBe('info');
  });

  it('handles case-insensitive input', () => {
    const meta = getStatusMeta('APPROVED');
    expect(meta.key).toBe('approved');
    expect(meta.label).toBe('Approved');
  });

  it('returns humanised label for unknown status', () => {
    const meta = getStatusMeta('some_custom_thing');
    expect(meta.key).toBe('some_custom_thing');
    expect(meta.label).toBe('Some Custom Thing');
    expect(meta.tone).toBe('neutral');
    expect(meta.iconKey).toBe('dot');
  });

  it('returns humanised label for hyphenated unknown status', () => {
    const meta = getStatusMeta('my-weird-status');
    expect(meta.label).toBe('My Weird Status');
  });

  it('returns neutral fallback for null', () => {
    const meta = getStatusMeta(null);
    expect(meta.key).toBe('info');
    expect(meta.tone).toBe('info');
  });

  it('returns neutral fallback for undefined', () => {
    const meta = getStatusMeta(undefined);
    expect(meta.key).toBe('info');
  });

  it('handles whitespace-padded input', () => {
    const meta = getStatusMeta('  completed  ');
    expect(meta.key).toBe('completed');
    expect(meta.tone).toBe('success');
  });

  // ── Approval chain statuses ────────────────────────────────────
  it('handles manager_approved', () => {
    const meta = getStatusMeta('manager_approved');
    expect(meta.label).toBe('Manager Approved');
    expect(meta.tone).toBe('info');
  });

  it('handles gm_approved', () => {
    const meta = getStatusMeta('gm_approved');
    expect(meta.label).toBe('GM Approved');
    expect(meta.tone).toBe('info');
  });

  it('handles director_approved', () => {
    const meta = getStatusMeta('director_approved');
    expect(meta.label).toBe('Director Approved');
    expect(meta.tone).toBe('success');
  });

  it('handles hr_approved', () => {
    const meta = getStatusMeta('hr_approved');
    expect(meta.label).toBe('HR Approved');
    expect(meta.tone).toBe('success');
  });

  // ── Payroll statuses ───────────────────────────────────────────
  it('handles paid', () => {
    expect(getStatusMeta('paid').tone).toBe('success');
  });

  it('handles unpaid', () => {
    expect(getStatusMeta('unpaid').tone).toBe('warning');
  });

  // ── Notification statuses ──────────────────────────────────────
  it('handles read', () => {
    expect(getStatusMeta('read').tone).toBe('neutral');
  });

  it('handles unread', () => {
    expect(getStatusMeta('unread').tone).toBe('info');
  });

  // ── Document statuses ──────────────────────────────────────────
  it('handles document_requested', () => {
    const meta = getStatusMeta('document_requested');
    expect(meta.label).toBe('Doc Requested');
    expect(meta.tone).toBe('warning');
  });

  it('handles document_attached', () => {
    const meta = getStatusMeta('document_attached');
    expect(meta.label).toBe('Doc Attached');
    expect(meta.tone).toBe('success');
  });
});

// ── getStatusRegistrySnapshot ────────────────────────────────────
describe('getStatusRegistrySnapshot', () => {
  it('returns a frozen record of all registered statuses', () => {
    const snapshot = getStatusRegistrySnapshot();
    expect(typeof snapshot).toBe('object');
    expect(snapshot.pending).toBeDefined();
    expect(snapshot.approved).toBeDefined();
    expect(snapshot.rejected).toBeDefined();
  });

  it('contains expected fields per entry', () => {
    const snapshot = getStatusRegistrySnapshot();
    const entry = snapshot.pending;
    expect(entry).toHaveProperty('label');
    expect(entry).toHaveProperty('tone');
    expect(entry).toHaveProperty('iconKey');
  });

  it('includes all attendance statuses', () => {
    const snapshot = getStatusRegistrySnapshot();
    for (const key of ['present', 'absent', 'late', 'half_day', 'on_leave']) {
      expect(snapshot[key]).toBeDefined();
    }
  });

  it('includes all priority levels', () => {
    const snapshot = getStatusRegistrySnapshot();
    for (const key of ['low', 'normal', 'high', 'urgent']) {
      expect(snapshot[key]).toBeDefined();
    }
  });
});
