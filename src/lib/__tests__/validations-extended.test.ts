import { describe, expect, it } from 'vitest';
import {
  clockInSchema,
  uploadDocumentSchema,
  createSalaryStructureSchema,
  createPerformanceReviewSchema,
  createAnnouncementSchema,
  updateMyProfileSchema,
  passwordSchema,
  validatePassword,
  validateDocumentFile,
} from '@/lib/validations';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ── clockInSchema ────────────────────────────────────────────────
describe('clockInSchema', () => {
  const validPayload = {
    employee_id: VALID_UUID,
    date: '2026-01-15',
    clock_in: '2026-01-15T08:00:00.000Z',
    status: 'present' as const,
  };

  it('accepts a valid clock-in payload', () => {
    expect(clockInSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts "late" status', () => {
    expect(
      clockInSchema.safeParse({ ...validPayload, status: 'late' }).success,
    ).toBe(true);
  });

  it('rejects invalid employee_id', () => {
    const result = clockInSchema.safeParse({ ...validPayload, employee_id: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = clockInSchema.safeParse({ ...validPayload, date: '01-15-2026' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid clock_in datetime', () => {
    const result = clockInSchema.safeParse({ ...validPayload, clock_in: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const result = clockInSchema.safeParse({ ...validPayload, status: 'absent' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(clockInSchema.safeParse({}).success).toBe(false);
  });
});

// ── uploadDocumentSchema ─────────────────────────────────────────
describe('uploadDocumentSchema', () => {
  const validPayload = {
    employeeId: VALID_UUID,
    title: 'Employment Contract',
    category: 'contract' as const,
  };

  it('accepts a valid upload payload', () => {
    expect(uploadDocumentSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts optional description', () => {
    expect(
      uploadDocumentSchema.safeParse({
        ...validPayload,
        description: 'Signed copy',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid category', () => {
    const result = uploadDocumentSchema.safeParse({
      ...validPayload,
      category: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    for (const cat of ['contract', 'certificate', 'official', 'other']) {
      expect(
        uploadDocumentSchema.safeParse({ ...validPayload, category: cat }).success,
      ).toBe(true);
    }
  });

  it('rejects empty title', () => {
    const result = uploadDocumentSchema.safeParse({ ...validPayload, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 chars', () => {
    const result = uploadDocumentSchema.safeParse({
      ...validPayload,
      title: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 1000 chars', () => {
    const result = uploadDocumentSchema.safeParse({
      ...validPayload,
      description: 'X'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid employeeId', () => {
    const result = uploadDocumentSchema.safeParse({ ...validPayload, employeeId: 'xyz' });
    expect(result.success).toBe(false);
  });
});

// ── createSalaryStructureSchema ──────────────────────────────────
describe('createSalaryStructureSchema', () => {
  const validPayload = {
    employee_id: VALID_UUID,
    basic_salary: 50000,
  };

  it('accepts a valid salary structure', () => {
    expect(createSalaryStructureSchema.safeParse(validPayload).success).toBe(true);
  });

  it('defaults optional allowances to 0', () => {
    const result = createSalaryStructureSchema.safeParse(validPayload);
    if (result.success) {
      expect(result.data.housing_allowance).toBe(0);
      expect(result.data.transport_allowance).toBe(0);
      expect(result.data.meal_allowance).toBe(0);
      expect(result.data.other_allowances).toBe(0);
    } else {
      expect.unreachable('Should succeed');
    }
  });

  it('accepts salary with all allowances specified', () => {
    const result = createSalaryStructureSchema.safeParse({
      ...validPayload,
      housing_allowance: 10000,
      transport_allowance: 5000,
      meal_allowance: 3000,
      other_allowances: 2000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative basic salary', () => {
    const result = createSalaryStructureSchema.safeParse({
      ...validPayload,
      basic_salary: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative allowances', () => {
    const result = createSalaryStructureSchema.safeParse({
      ...validPayload,
      housing_allowance: -500,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero basic salary', () => {
    const result = createSalaryStructureSchema.safeParse({
      ...validPayload,
      basic_salary: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing employee_id', () => {
    const result = createSalaryStructureSchema.safeParse({ basic_salary: 5000 });
    expect(result.success).toBe(false);
  });

  it('rejects missing basic_salary', () => {
    const result = createSalaryStructureSchema.safeParse({ employee_id: VALID_UUID });
    expect(result.success).toBe(false);
  });
});

// ── createPerformanceReviewSchema ────────────────────────────────
describe('createPerformanceReviewSchema', () => {
  const validPayload = {
    employee_id: VALID_UUID,
    review_period: 'Q1 2026',
    overall_rating: 4,
  };

  it('accepts a valid review', () => {
    expect(createPerformanceReviewSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts min rating = 1', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, overall_rating: 1 }).success,
    ).toBe(true);
  });

  it('accepts max rating = 5', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, overall_rating: 5 }).success,
    ).toBe(true);
  });

  it('rejects rating below 1', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, overall_rating: 0 }).success,
    ).toBe(false);
  });

  it('rejects rating above 5', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, overall_rating: 6 }).success,
    ).toBe(false);
  });

  it('accepts optional goals_met 0–100', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, goals_met: 85 }).success,
    ).toBe(true);
  });

  it('rejects goals_met below 0', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, goals_met: -1 }).success,
    ).toBe(false);
  });

  it('rejects goals_met above 100', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, goals_met: 101 }).success,
    ).toBe(false);
  });

  it('accepts optional comments', () => {
    expect(
      createPerformanceReviewSchema.safeParse({
        ...validPayload,
        comments: 'Great performance!',
      }).success,
    ).toBe(true);
  });

  it('rejects comments exceeding 5000 chars', () => {
    expect(
      createPerformanceReviewSchema.safeParse({
        ...validPayload,
        comments: 'X'.repeat(5001),
      }).success,
    ).toBe(false);
  });

  it('rejects empty review_period', () => {
    expect(
      createPerformanceReviewSchema.safeParse({ ...validPayload, review_period: '' }).success,
    ).toBe(false);
  });

  it('rejects review_period exceeding 100 chars', () => {
    expect(
      createPerformanceReviewSchema.safeParse({
        ...validPayload,
        review_period: 'X'.repeat(101),
      }).success,
    ).toBe(false);
  });
});

// ── createAnnouncementSchema ─────────────────────────────────────
describe('createAnnouncementSchema', () => {
  const validPayload = {
    title: 'Company Meeting',
    content: 'All hands meeting at 3pm',
  };

  it('accepts a valid announcement', () => {
    expect(createAnnouncementSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts optional priority', () => {
    for (const priority of ['low', 'medium', 'high']) {
      expect(
        createAnnouncementSchema.safeParse({ ...validPayload, priority }).success,
      ).toBe(true);
    }
  });

  it('rejects invalid priority', () => {
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, priority: 'urgent' }).success,
    ).toBe(false);
  });

  it('rejects empty title', () => {
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, title: '' }).success,
    ).toBe(false);
  });

  it('rejects title exceeding 200 chars', () => {
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, title: 'T'.repeat(201) }).success,
    ).toBe(false);
  });

  it('rejects empty content', () => {
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, content: '' }).success,
    ).toBe(false);
  });

  it('rejects content exceeding 10000 chars', () => {
    expect(
      createAnnouncementSchema.safeParse({
        ...validPayload,
        content: 'C'.repeat(10001),
      }).success,
    ).toBe(false);
  });

  it('accepts future expires_at datetime', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, expires_at: future }).success,
    ).toBe(true);
  });

  it('rejects past expires_at datetime', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, expires_at: past }).success,
    ).toBe(false);
  });

  it('rejects invalid expires_at format', () => {
    expect(
      createAnnouncementSchema.safeParse({ ...validPayload, expires_at: 'not-a-date' }).success,
    ).toBe(false);
  });
});

// ── updateMyProfileSchema ────────────────────────────────────────
describe('updateMyProfileSchema', () => {
  const validPayload = {
    first_name: 'John',
    last_name: 'Doe',
  };

  it('accepts a valid profile update', () => {
    expect(updateMyProfileSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts optional phone number', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, phone: '+1 (555) 123-4567' }).success,
    ).toBe(true);
  });

  it('accepts null phone number', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, phone: null }).success,
    ).toBe(true);
  });

  it('rejects empty first_name', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, first_name: '' }).success,
    ).toBe(false);
  });

  it('rejects empty last_name', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, last_name: '' }).success,
    ).toBe(false);
  });

  it('rejects first_name exceeding 100 chars', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, first_name: 'A'.repeat(101) }).success,
    ).toBe(false);
  });

  it('rejects invalid phone format', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, phone: 'abc' }).success,
    ).toBe(false);
  });

  it('accepts phone with international prefix', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, phone: '+639123456789' }).success,
    ).toBe(true);
  });

  it('rejects phone shorter than 7 digits', () => {
    expect(
      updateMyProfileSchema.safeParse({ ...validPayload, phone: '12345' }).success,
    ).toBe(false);
  });
});

// ── passwordSchema / validatePassword ────────────────────────────
describe('passwordSchema', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('MyP@ssw0rd!').success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = passwordSchema.safeParse('Ab1!');
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = passwordSchema.safeParse('mypassw0rd!');
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = passwordSchema.safeParse('MYPASSW0RD!');
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = passwordSchema.safeParse('MyPassword!');
    expect(result.success).toBe(false);
  });

  it('rejects password without special character', () => {
    const result = passwordSchema.safeParse('MyPassw0rd');
    expect(result.success).toBe(false);
  });
});

describe('validatePassword', () => {
  it('returns null for a valid password', () => {
    expect(validatePassword('MyP@ssw0rd!')).toBeNull();
  });

  it('returns error message for short password', () => {
    const msg = validatePassword('Ab1!');
    expect(msg).toContain('8 characters');
  });

  it('returns error message for missing uppercase', () => {
    const msg = validatePassword('mypassw0rd!');
    expect(msg).toContain('uppercase');
  });

  it('returns error message for missing lowercase', () => {
    const msg = validatePassword('MYPASSW0RD!');
    expect(msg).toContain('lowercase');
  });

  it('returns error message for missing number', () => {
    const msg = validatePassword('MyPassword!');
    expect(msg).toContain('number');
  });

  it('returns error message for missing special character', () => {
    const msg = validatePassword('MyPassw0rd');
    expect(msg).toContain('special');
  });

  it('returns first encountered error', () => {
    // just verify it returns a string (not null)
    expect(typeof validatePassword('')).toBe('string');
  });
});

// ── validateDocumentFile (non-leave-specific tests) ──────────────
describe('validateDocumentFile — extended', () => {
  function fakeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
    const buffer = new ArrayBuffer(sizeBytes);
    return new File([buffer], name, { type });
  }

  it('accepts a CSV file under size limit', () => {
    expect(validateDocumentFile(fakeFile('data.csv', 1024))).toBeNull();
  });

  it('accepts an RTF file', () => {
    expect(validateDocumentFile(fakeFile('notes.rtf', 1024))).toBeNull();
  });

  it('accepts an ODS file', () => {
    expect(validateDocumentFile(fakeFile('sheet.ods', 1024))).toBeNull();
  });

  it('accepts a TXT file', () => {
    expect(validateDocumentFile(fakeFile('readme.txt', 1024))).toBeNull();
  });

  it('rejects a ZIP file', () => {
    expect(validateDocumentFile(fakeFile('archive.zip', 1024))).toContain('not allowed');
  });

  it('rejects an EXE file', () => {
    expect(validateDocumentFile(fakeFile('malware.exe', 1024))).toContain('not allowed');
  });

  it('rejects a file with no extension', () => {
    expect(validateDocumentFile(fakeFile('noextension', 1024))).toContain('not allowed');
  });

  it('reports file size exceeding 10MB', () => {
    const tooBig = fakeFile('large.pdf', 11 * 1024 * 1024);
    const err = validateDocumentFile(tooBig);
    expect(err).toContain('maximum size');
    expect(err).toContain('10');
  });

  it('accepts exactly 10MB file', () => {
    const exact = fakeFile('exact.pdf', 10 * 1024 * 1024);
    expect(validateDocumentFile(exact)).toBeNull();
  });
});
