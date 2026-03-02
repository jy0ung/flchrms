import { describe, expect, it } from 'vitest';
import {
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  validateDocumentFile,
} from '@/lib/validations';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeValidLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    leave_type_id: '550e8400-e29b-41d4-a716-446655440000',
    start_date: '2026-03-01',
    end_date: '2026-03-05',
    days_count: 5,
    reason: 'Family vacation',
    ...overrides,
  };
}

function fakeFile(
  name: string,
  sizeBytes: number,
  type = 'application/pdf',
): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type });
}

// ── createLeaveRequestSchema ─────────────────────────────────────────────────
describe('createLeaveRequestSchema', () => {
  it('accepts a fully valid leave request', () => {
    const result = createLeaveRequestSchema.safeParse(makeValidLeaveRequest());
    expect(result.success).toBe(true);
  });

  it('accepts a request with minimal fields (no optional reason/document)', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ reason: undefined, document_url: undefined }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts empty string for document_url (optional union with literal)', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ document_url: '' }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts a valid document_url string', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ document_url: 'https://storage.example.com/doc.pdf' }),
    );
    expect(result.success).toBe(true);
  });

  // ── leave_type_id ────────────────────────────────────────────
  it('rejects non-UUID leave_type_id', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ leave_type_id: 'not-a-uuid' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('leave_type_id'))).toBe(true);
    }
  });

  it('rejects missing leave_type_id', () => {
    const { leave_type_id, ...rest } = makeValidLeaveRequest();
    const result = createLeaveRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  // ── date formats ─────────────────────────────────────────────
  it('rejects non-ISO date format (MM/DD/YYYY)', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ start_date: '03/01/2026' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects datetime strings (includes time component)', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ start_date: '2026-03-01T00:00:00Z' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects missing start_date', () => {
    const { start_date, ...rest } = makeValidLeaveRequest();
    const result = createLeaveRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing end_date', () => {
    const { end_date, ...rest } = makeValidLeaveRequest();
    const result = createLeaveRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  // ── start ≤ end refinement ───────────────────────────────────
  it('rejects end_date before start_date', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ start_date: '2026-03-05', end_date: '2026-03-01' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('Start date must be on or before end date')),
      ).toBe(true);
    }
  });

  it('accepts same start and end date (single day)', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ start_date: '2026-03-01', end_date: '2026-03-01', days_count: 1 }),
    );
    expect(result.success).toBe(true);
  });

  // ── days_count ───────────────────────────────────────────────
  it('rejects zero days_count', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ days_count: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects negative days_count', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ days_count: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects fractional days_count', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ days_count: 2.5 }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts days_count of 1', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ days_count: 1 }),
    );
    expect(result.success).toBe(true);
  });

  // ── reason ───────────────────────────────────────────────────
  it('rejects reason exceeding 2000 characters', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ reason: 'x'.repeat(2001) }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts reason exactly 2000 characters', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ reason: 'x'.repeat(2000) }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts empty string reason', () => {
    const result = createLeaveRequestSchema.safeParse(
      makeValidLeaveRequest({ reason: '' }),
    );
    expect(result.success).toBe(true);
  });
});

// ── createLeaveTypeSchema ────────────────────────────────────────────────────
describe('createLeaveTypeSchema', () => {
  const validType = {
    name: 'Annual Leave',
    days_allowed: 14,
  };

  it('accepts valid leave type with minimal fields', () => {
    const result = createLeaveTypeSchema.safeParse(validType);
    expect(result.success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const result = createLeaveTypeSchema.safeParse({
      ...validType,
      min_days: 3,
      description: 'Standard annual leave allocation',
    });
    expect(result.success).toBe(true);
  });

  // ── name ─────────────────────────────────────────────────────
  it('rejects empty name', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts name exactly 100 characters', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });

  // ── days_allowed ─────────────────────────────────────────────
  it('rejects negative days_allowed', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, days_allowed: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts zero days_allowed (unpaid leave types)', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, days_allowed: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects fractional days_allowed', () => {
    const result = createLeaveTypeSchema.safeParse({ ...validType, days_allowed: 3.5 });
    expect(result.success).toBe(false);
  });

  // ── min_days vs days_allowed refinement ──────────────────────
  it('rejects min_days exceeding days_allowed', () => {
    const result = createLeaveTypeSchema.safeParse({
      ...validType,
      days_allowed: 5,
      min_days: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('Minimum days cannot exceed allowed days')),
      ).toBe(true);
    }
  });

  it('accepts min_days equal to days_allowed', () => {
    const result = createLeaveTypeSchema.safeParse({
      ...validType,
      days_allowed: 5,
      min_days: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts min_days less than days_allowed', () => {
    const result = createLeaveTypeSchema.safeParse({
      ...validType,
      days_allowed: 14,
      min_days: 3,
    });
    expect(result.success).toBe(true);
  });

  // ── description ──────────────────────────────────────────────
  it('rejects description exceeding 500 characters', () => {
    const result = createLeaveTypeSchema.safeParse({
      ...validType,
      description: 'd'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ── validateDocumentFile ─────────────────────────────────────────────────────
describe('validateDocumentFile', () => {
  // ── valid files ──────────────────────────────────────────────
  const validExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'txt', 'rtf', 'odt', 'ods',
  ];

  it.each(validExtensions)('accepts .%s files under size limit', (ext) => {
    const file = fakeFile(`document.${ext}`, 1024);
    expect(validateDocumentFile(file)).toBeNull();
  });

  it('accepts file exactly at 10MB limit', () => {
    const file = fakeFile('big.pdf', 10 * 1024 * 1024);
    expect(validateDocumentFile(file)).toBeNull();
  });

  // ── invalid size ─────────────────────────────────────────────
  it('rejects file exceeding 10MB', () => {
    const file = fakeFile('huge.pdf', 10 * 1024 * 1024 + 1);
    const error = validateDocumentFile(file);
    expect(error).not.toBeNull();
    expect(error).toContain('10 MB');
  });

  // ── invalid extensions ───────────────────────────────────────
  it.each(['exe', 'bat', 'sh', 'js', 'html', 'zip', 'rar', 'mp3', 'mp4'])(
    'rejects .%s files',
    (ext) => {
      const file = fakeFile(`malicious.${ext}`, 1024);
      const error = validateDocumentFile(file);
      expect(error).not.toBeNull();
      expect(error).toContain('not allowed');
    },
  );

  it('rejects file with no extension', () => {
    const file = fakeFile('noextension', 1024);
    const error = validateDocumentFile(file);
    expect(error).not.toBeNull();
  });

  it('handles uppercase extensions', () => {
    // validateDocumentFile lowercases the extension, so .PDF should work
    const file = fakeFile('document.PDF', 1024);
    expect(validateDocumentFile(file)).toBeNull();
  });

  it('handles double extensions (uses last)', () => {
    const file = fakeFile('archive.tar.gz', 1024);
    const error = validateDocumentFile(file);
    expect(error).not.toBeNull();
    // Should reject based on .gz extension (last segment)
  });
});
