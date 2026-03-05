/**
 * Zod validation schemas for all mutation inputs.
 *
 * These schemas provide runtime safety on top of TypeScript types,
 * catching invalid data *before* it reaches the database layer.
 */
import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────
const uuid = z.string().uuid('Must be a valid UUID');
const nonEmptyString = z.string().min(1, 'Required');
const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// ── Leave Request ────────────────────────────────────────────────
export const createLeaveRequestSchema = z
  .object({
    leave_type_id: uuid,
    start_date: isoDateString,
    end_date: isoDateString,
    days_count: z
      .number()
      .positive('Must be greater than 0')
      .refine((value) => Number.isInteger(value * 2), {
        message: 'Must be in 0.5-day increments',
      }),
    reason: z.string().max(2000).optional(),
    document_url: z.string().min(1).optional().or(z.literal('')),
  })
  .refine((d: { start_date: string; end_date: string }) => d.start_date <= d.end_date, {
    message: 'Start date must be on or before end date',
    path: ['end_date'],
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

// ── Leave Type ───────────────────────────────────────────────────
export const createLeaveTypeSchema = z
  .object({
    name: nonEmptyString.max(100),
    days_allowed: z.number().int().nonnegative('Must be 0 or more'),
    min_days: z.number().int().nonnegative('Must be 0 or more').optional(),
    description: z.string().max(500).optional(),
  })
  .refine(
    (d: { min_days?: number; days_allowed: number }) => d.min_days === undefined || d.min_days <= d.days_allowed,
    { message: 'Minimum days cannot exceed allowed days', path: ['min_days'] },
  );

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

// ── Attendance ───────────────────────────────────────────────────
/** No user input needed — all values are derived from clock time.
 *  This schema validates the insert payload itself.                */
export const clockInSchema = z.object({
  employee_id: uuid,
  date: isoDateString,
  clock_in: z.string().datetime(),
  status: z.enum(['present', 'late']),
});

// ── Document Upload ──────────────────────────────────────────────
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'txt', 'rtf', 'odt', 'ods',
]);

export const uploadDocumentSchema = z.object({
  employeeId: uuid,
  title: nonEmptyString.max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['contract', 'certificate', 'official', 'other']),
});

/** Validate File object constraints (call separately because File is not JSON-serialisable) */
export function validateDocumentFile(file: File): string | null {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return `File exceeds maximum size of ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} MB`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
    return `File type .${ext ?? '(none)'} is not allowed. Accepted: ${[...ALLOWED_DOCUMENT_EXTENSIONS].join(', ')}`;
  }
  return null;
}

// ── Salary Structure ─────────────────────────────────────────────
export const createSalaryStructureSchema = z.object({
  employee_id: uuid,
  basic_salary: z.number().nonnegative('Basic salary must be >= 0'),
  housing_allowance: z.number().nonnegative().default(0),
  transport_allowance: z.number().nonnegative().default(0),
  meal_allowance: z.number().nonnegative().default(0),
  other_allowances: z.number().nonnegative().default(0),
});

export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;

// ── Performance Review ───────────────────────────────────────────
export const createPerformanceReviewSchema = z.object({
  employee_id: uuid,
  review_period: nonEmptyString.max(100),
  overall_rating: z.number().min(1).max(5),
  goals_met: z.number().min(0).max(100).optional(),
  comments: z.string().max(5000).optional(),
});

export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;

// ── Announcement ─────────────────────────────────────────────────
export const createAnnouncementSchema = z.object({
  title: nonEmptyString.max(200),
  content: nonEmptyString.max(10000),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  expires_at: z
    .string()
    .datetime()
    .optional()
    .refine((v: string | undefined) => !v || new Date(v) > new Date(), {
      message: 'Expiry date must be in the future',
    }),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

// ── Profile Update ───────────────────────────────────────────────
export const updateMyProfileSchema = z.object({
  first_name: nonEmptyString.max(100),
  last_name: nonEmptyString.max(100),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-().]{7,20}$/, 'Invalid phone number format')
    .nullable()
    .optional(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

// ── Password ─────────────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

/** Returns null if valid, or human-readable error string */
export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (result.success) return null;
  return result.error.errors[0]?.message ?? 'Invalid password';
}
