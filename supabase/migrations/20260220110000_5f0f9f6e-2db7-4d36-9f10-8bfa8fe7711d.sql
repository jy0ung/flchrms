-- Align leave workflow constraints with multi-level approval statuses
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (
  status IN (
    'pending',
    'manager_approved',
    'gm_approved',
    'director_approved',
    'hr_approved',
    'rejected',
    'cancelled'
  )
);

-- Normalize nullable legacy fields to match application assumptions
UPDATE public.leave_requests
SET status = 'pending'
WHERE status IS NULL;

UPDATE public.leave_requests
SET document_required = false
WHERE document_required IS NULL;

UPDATE public.leave_types
SET min_days = 0
WHERE min_days IS NULL;

UPDATE public.leave_types
SET requires_document = false
WHERE requires_document IS NULL;

UPDATE public.leave_types
SET is_paid = true
WHERE is_paid IS NULL;

-- Tighten column contracts for predictable client behavior
ALTER TABLE public.leave_requests
ALTER COLUMN status SET DEFAULT 'pending',
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN document_required SET DEFAULT false,
ALTER COLUMN document_required SET NOT NULL;

ALTER TABLE public.leave_types
ALTER COLUMN days_allowed SET NOT NULL,
ALTER COLUMN min_days SET DEFAULT 0,
ALTER COLUMN min_days SET NOT NULL,
ALTER COLUMN requires_document SET DEFAULT false,
ALTER COLUMN requires_document SET NOT NULL,
ALTER COLUMN is_paid SET DEFAULT true,
ALTER COLUMN is_paid SET NOT NULL;
