-- HRMS default schema bootstrap
-- Generated from supabase/migrations on 2026-02-20
-- Apply this file to initialize a fresh database with the current baseline schema and policies.
-- Example:
--   psql "$DATABASE_URL" -f supabase/default_schema.sql
--   # or use this SQL as your initial migration in a new Supabase project.

-- Source: 20260121070602_db9a9f5e-8185-4c58-a12c-18e3b32d317b.sql
-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'manager', 'employee');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  department_id UUID REFERENCES public.departments(id),
  job_title TEXT,
  hire_date DATE,
  manager_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for department manager after profiles table exists
ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create leave types table
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  days_allowed INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES public.leave_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'manager_approved', 'hr_approved', 'rejected', 'cancelled')),
  manager_approved_by UUID REFERENCES public.profiles(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by UUID REFERENCES public.profiles(id),
  hr_approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);

-- Create training programs table
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration_hours INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employee training enrollments
CREATE TABLE public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.training_programs(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score INTEGER,
  UNIQUE (employee_id, program_id)
);

-- Create performance reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) NOT NULL,
  review_period TEXT NOT NULL,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_by UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user is manager of employee
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_id UUID, _employee_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _employee_id AND manager_id = _manager_id
  )
$$;

-- Departments policies
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR and Admin can manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "HR and Admin can manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Leave types policies
CREATE POLICY "Leave types viewable by all authenticated"
  ON public.leave_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can manage leave types"
  ON public.leave_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Leave requests policies
CREATE POLICY "Employees can view own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), employee_id));

CREATE POLICY "HR can view all leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can create own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own pending requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() AND status = 'pending');

CREATE POLICY "Managers can approve team leave requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), employee_id));

CREATE POLICY "HR can manage all leave requests"
  ON public.leave_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Attendance policies
CREATE POLICY "Employees can view own attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can manage own attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') AND public.is_manager_of(auth.uid(), employee_id));

CREATE POLICY "HR can manage all attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Training programs policies
CREATE POLICY "Training programs viewable by all"
  ON public.training_programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "HR can manage training programs"
  ON public.training_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Training enrollments policies
CREATE POLICY "Employees can view own enrollments"
  ON public.training_enrollments FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "HR can manage all enrollments"
  ON public.training_enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Performance reviews policies
CREATE POLICY "Employees can view own reviews"
  ON public.performance_reviews FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Reviewers can manage their reviews"
  ON public.performance_reviews FOR ALL TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "HR can manage all reviews"
  ON public.performance_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Announcements policies
CREATE POLICY "Active announcements viewable by all"
  ON public.announcements FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "HR can manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- Insert default leave types
INSERT INTO public.leave_types (name, description, days_allowed, is_paid) VALUES
  ('Annual Leave', 'Paid vacation time', 14, true),
  ('Sick Leave', 'Medical leave with documentation', 10, true),
  ('Personal Leave', 'Personal time off', 3, true),
  ('Unpaid Leave', 'Leave without pay', 30, false),
  ('Maternity Leave', 'Maternity leave for new mothers', 90, true),
  ('Paternity Leave', 'Paternity leave for new fathers', 14, true);

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Human Resources', 'HR and people operations'),
  ('Finance', 'Financial operations and accounting'),
  ('Marketing', 'Marketing and communications'),
  ('Operations', 'Business operations and logistics');

-- Function to create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role app_role := 'employee';
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name, employee_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'EMP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 4)
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Source: 20260122001849_906e70e6-b450-4e1e-bb8b-ad760151759c.sql
-- Fix profiles table SELECT policy to restrict access to sensitive employee data
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create more restrictive policies for profile access

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Managers can view their direct reports' profiles
CREATE POLICY "Managers can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND manager_id = auth.uid()
);

-- HR and Admin can view all profiles
CREATE POLICY "HR and Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'hr'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Source: 20260122002636_f92731b3-9f0b-45be-b41f-78f5b033d692.sql
-- Add policy for HR/Admin to view all user roles (needed for the Admin dashboard)
CREATE POLICY "HR and Admin can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'hr'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Source: 20260123031903_bcdc12f0-0961-449a-9e8c-21013b008e88.sql
-- Add new status for document request workflow
-- Update leave_types to support policy configuration
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS min_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS requires_document boolean DEFAULT false;

-- Add columns to leave_requests for document support and amendments
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_comments text,
ADD COLUMN IF NOT EXISTS amendment_notes text,
ADD COLUMN IF NOT EXISTS amended_at timestamp with time zone;

-- Update leave_types with sensible defaults
UPDATE public.leave_types SET min_days = 7 WHERE name ILIKE '%annual%';
UPDATE public.leave_types SET min_days = 1 WHERE min_days IS NULL;

-- Allow HR to update leave_types
CREATE POLICY "HR can update leave types" 
ON public.leave_types 
FOR UPDATE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Source: 20260123033419_433af095-e991-4eca-84c0-3ae09119f211.sql
-- Create a function to check if manager is in same department as employee
CREATE OR REPLACE FUNCTION public.is_department_manager(_manager_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles manager
    JOIN public.profiles employee ON employee.id = _employee_id
    WHERE manager.id = _manager_id 
    AND manager.department_id IS NOT NULL
    AND manager.department_id = employee.department_id
  )
$$;

-- Drop existing manager policies for profiles
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;

-- Create new policy: Managers can view profiles in their department
CREATE POLICY "Managers can view department profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    id = auth.uid() -- Can see own profile
    OR manager_id = auth.uid() -- Can see direct reports
    OR is_department_manager(auth.uid(), id) -- Can see same department
  )
);

-- Drop existing manager policies for leave_requests
DROP POLICY IF EXISTS "Managers can view team leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can approve team leave requests" ON public.leave_requests;

-- Create new policy: Managers can view leave requests from their department
CREATE POLICY "Managers can view department leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    employee_id = auth.uid() -- Can see own requests
    OR is_manager_of(auth.uid(), employee_id) -- Direct reports
    OR is_department_manager(auth.uid(), employee_id) -- Same department
  )
);

-- Create new policy: Managers can approve leave requests from their department
CREATE POLICY "Managers can approve department leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    is_manager_of(auth.uid(), employee_id)
    OR is_department_manager(auth.uid(), employee_id)
  )
);

-- Drop existing manager policies for attendance
DROP POLICY IF EXISTS "Managers can view team attendance" ON public.attendance;

-- Create new policy: Managers can view attendance from their department
CREATE POLICY "Managers can view department attendance"
ON public.attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    employee_id = auth.uid() -- Can see own attendance
    OR is_manager_of(auth.uid(), employee_id) -- Direct reports
    OR is_department_manager(auth.uid(), employee_id) -- Same department
  )
);

-- Source: 20260124140001_87987c06-46fb-4d8a-83cf-6c053f012521.sql
-- Add RLS policies for leave-documents storage bucket
-- Files are organized as: {user_id}/{timestamp}.{ext}

-- Policy: Employees can upload their own documents
CREATE POLICY "Employees can upload own leave documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Employees can view their own documents, HR/Admin can view all, Managers can view their reports
CREATE POLICY "Users can view authorized leave documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND (
    -- Owner can view their own documents
    auth.uid()::text = (storage.foldername(name))[1]
    -- HR and Admin can view all documents
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    -- Managers can view documents of their direct reports or department members
    OR public.is_manager_of(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.is_department_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own leave documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own leave documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Source: 20260127120454_de23960b-2386-4c19-babd-2c17266bdcb5.sql
-- Create document categories enum
CREATE TYPE public.document_category AS ENUM ('contract', 'certificate', 'official', 'other');

-- Create documents table for centralized document management
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
-- Employees can view their own documents
CREATE POLICY "Employees can view own documents"
ON public.documents FOR SELECT
USING (employee_id = auth.uid());

-- Managers can view department documents
CREATE POLICY "Managers can view department documents"
ON public.documents FOR SELECT
USING (
  has_role(auth.uid(), 'manager') AND 
  is_department_manager(auth.uid(), employee_id)
);

-- HR/Admin can view all documents
CREATE POLICY "HR and Admin can view all documents"
ON public.documents FOR SELECT
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- HR/Admin can manage all documents
CREATE POLICY "HR and Admin can manage documents"
ON public.documents FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', false);

-- Storage policies for employee-documents bucket
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "HR can view all documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents' AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "HR can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-documents' AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "HR can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-documents' AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin')));

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Everyone can view holidays
CREATE POLICY "Holidays viewable by all authenticated"
ON public.holidays FOR SELECT
USING (true);

-- HR/Admin can manage holidays
CREATE POLICY "HR and Admin can manage holidays"
ON public.holidays FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Create department events table
CREATE TABLE public.department_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  event_type TEXT DEFAULT 'meeting',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for department events
ALTER TABLE public.department_events ENABLE ROW LEVEL SECURITY;

-- Employees can view events for their department
CREATE POLICY "Employees can view department events"
ON public.department_events FOR SELECT
USING (
  department_id IN (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  ) OR department_id IS NULL
);

-- HR/Admin can view all events
CREATE POLICY "HR and Admin can view all events"
ON public.department_events FOR SELECT
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- HR/Admin/Managers can manage events
CREATE POLICY "HR Admin Managers can manage events"
ON public.department_events FOR ALL
USING (
  has_role(auth.uid(), 'hr') OR 
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'manager') AND is_department_manager(auth.uid(), auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'hr') OR 
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'manager') AND is_department_manager(auth.uid(), auth.uid()))
);

-- Add triggers for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_department_events_updated_at
  BEFORE UPDATE ON public.department_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Source: 20260203022033_28c7f987-3f83-4c2f-a3bf-27c72ab5eace.sql
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'general_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';

-- Source: 20260203022046_40aeed32-d53c-41ba-bb79-90abb53abe20.sql
-- Add new approval columns to leave_requests for multi-level approval
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS gm_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS gm_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS director_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS director_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hr_notified_at timestamp with time zone;

-- Update RLS policies for leave_requests to include new roles
DROP POLICY IF EXISTS "GM can approve department leave requests" ON public.leave_requests;
CREATE POLICY "GM can approve department leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  (is_manager_of(auth.uid(), employee_id) OR is_department_manager(auth.uid(), employee_id))
);

DROP POLICY IF EXISTS "GM can view department leave requests" ON public.leave_requests;
CREATE POLICY "GM can view department leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  ((employee_id = auth.uid()) OR is_manager_of(auth.uid(), employee_id) OR is_department_manager(auth.uid(), employee_id))
);

DROP POLICY IF EXISTS "Director can approve leave requests" ON public.leave_requests;
CREATE POLICY "Director can approve leave requests"
ON public.leave_requests
FOR UPDATE
USING (has_role(auth.uid(), 'director'::app_role));

DROP POLICY IF EXISTS "Director can view all leave requests" ON public.leave_requests;
CREATE POLICY "Director can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (has_role(auth.uid(), 'director'::app_role));

-- Update profiles RLS for new roles
DROP POLICY IF EXISTS "GM can view department profiles" ON public.profiles;
CREATE POLICY "GM can view department profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  ((id = auth.uid()) OR (manager_id = auth.uid()) OR is_department_manager(auth.uid(), id))
);

DROP POLICY IF EXISTS "Director can view all profiles" ON public.profiles;
CREATE POLICY "Director can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'director'::app_role));

-- Source: 20260206001338_fbcca1d8-39bb-4c96-a404-228a695f4287.sql
-- Create payroll-related enums
CREATE TYPE public.deduction_type AS ENUM ('fixed', 'percentage');
CREATE TYPE public.payroll_status AS ENUM ('draft', 'processing', 'completed', 'cancelled');
CREATE TYPE public.payslip_status AS ENUM ('pending', 'paid', 'cancelled');

-- Salary structures for employees
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  housing_allowance DECIMAL(12, 2) DEFAULT 0,
  transport_allowance DECIMAL(12, 2) DEFAULT 0,
  meal_allowance DECIMAL(12, 2) DEFAULT 0,
  other_allowances DECIMAL(12, 2) DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, effective_date)
);

-- Deduction types (EPF, SOCSO, tax, etc.)
CREATE TABLE public.deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  deduction_type deduction_type NOT NULL DEFAULT 'fixed',
  default_value DECIMAL(12, 2) DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee-specific deductions
CREATE TABLE public.employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deduction_type_id UUID NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, deduction_type_id)
);

-- Payroll periods
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE,
  status payroll_status DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual payslips
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_allowances DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  days_worked INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  days_leave INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  deductions_breakdown JSONB DEFAULT '{}',
  allowances_breakdown JSONB DEFAULT '{}',
  status payslip_status DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_structures
CREATE POLICY "HR and Admin can manage salary structures"
ON public.salary_structures FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own salary structure"
ON public.salary_structures FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for deduction_types
CREATE POLICY "HR and Admin can manage deduction types"
ON public.deduction_types FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view deduction types"
ON public.deduction_types FOR SELECT
USING (true);

-- RLS Policies for employee_deductions
CREATE POLICY "HR and Admin can manage employee deductions"
ON public.employee_deductions FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own deductions"
ON public.employee_deductions FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for payroll_periods
CREATE POLICY "HR and Admin can manage payroll periods"
ON public.payroll_periods FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view payroll periods"
ON public.payroll_periods FOR SELECT
USING (true);

-- RLS Policies for payslips
CREATE POLICY "HR and Admin can manage payslips"
ON public.payslips FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own payslips"
ON public.payslips FOR SELECT
USING (employee_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_salary_structures_updated_at
BEFORE UPDATE ON public.salary_structures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deduction_types_updated_at
BEFORE UPDATE ON public.deduction_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at
BEFORE UPDATE ON public.employee_deductions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
BEFORE UPDATE ON public.payroll_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
BEFORE UPDATE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default deduction types
INSERT INTO public.deduction_types (name, description, deduction_type, default_value, is_mandatory) VALUES
('EPF Employee', 'Employee Provident Fund contribution', 'percentage', 11, true),
('EPF Employer', 'Employer Provident Fund contribution', 'percentage', 12, true),
('SOCSO Employee', 'Social Security contribution', 'percentage', 0.5, true),
('Income Tax', 'Monthly tax deduction', 'percentage', 0, false),
('Health Insurance', 'Company health insurance', 'fixed', 0, false);

-- Source: 20260220110000_5f0f9f6e-2db7-4d36-9f10-8bfa8fe7711d.sql
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
