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

-- Source: 20260220124000_2f4fcb26-5e8b-4e9a-87e8-80fbf2f1d6a3.sql
-- Add username-based authentication support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Normalize user-supplied usernames to a safe format
CREATE OR REPLACE FUNCTION public.normalize_username(_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(coalesce(_value, '')), '[^a-z0-9._-]+', '', 'g'),
      '^[._-]+|[._-]+$',
      '',
      'g'
    ),
    ''
  );
$$;
REVOKE ALL ON FUNCTION public.normalize_username(TEXT) FROM PUBLIC;

-- Ensure each profile has a unique username
CREATE OR REPLACE FUNCTION public.generate_unique_username(_base TEXT, _profile_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_base TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  normalized_base := public.normalize_username(_base);

  IF normalized_base IS NULL THEN
    normalized_base := 'user';
  END IF;

  LOOP
    candidate := CASE
      WHEN suffix = 0 THEN normalized_base
      ELSE normalized_base || '_' || suffix::TEXT
    END;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = lower(candidate)
        AND (_profile_id IS NULL OR p.id <> _profile_id)
    );

    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_unique_username(TEXT, UUID) FROM PUBLIC;

-- Auto-populate username on insert/update
CREATE OR REPLACE FUNCTION public.set_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := coalesce(
    nullif(trim(NEW.username), ''),
    nullif(trim(NEW.employee_id), ''),
    split_part(coalesce(NEW.email, ''), '@', 1),
    split_part(NEW.id::TEXT, '-', 1)
  );

  NEW.username := public.generate_unique_username(base_username, NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_profile_username() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_profiles_username ON public.profiles;
CREATE TRIGGER set_profiles_username
BEFORE INSERT OR UPDATE OF username, email, employee_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_username();

-- Backfill existing profiles
UPDATE public.profiles
SET username = coalesce(
  nullif(trim(username), ''),
  nullif(trim(employee_id), ''),
  split_part(email, '@', 1),
  split_part(id::TEXT, '-', 1)
);

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (lower(username));

-- Resolve sign-in identifier (username/email/employee_id) to auth email for password login
CREATE OR REPLACE FUNCTION public.resolve_login_email(_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_identifier TEXT;
  resolved_email TEXT;
BEGIN
  normalized_identifier := lower(trim(coalesce(_identifier, '')));

  IF normalized_identifier = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.email
  INTO resolved_email
  FROM public.profiles p
  WHERE lower(p.username) = normalized_identifier
     OR lower(coalesce(p.employee_id, '')) = normalized_identifier
     OR lower(p.email) = normalized_identifier
  LIMIT 1;

  RETURN resolved_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;

-- Source: 20260220134500_9f3cc184-6f8a-4bba-a13d-17a53f4b5d58.sql
-- Performance optimization migration
-- 1) Add indexes for all unindexed foreign keys in public schema
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments (manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles (manager_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_director_approved_by ON public.leave_requests (director_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_gm_approved_by ON public.leave_requests (gm_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_approved_by ON public.leave_requests (hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON public.leave_requests (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_approved_by ON public.leave_requests (manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by ON public.leave_requests (rejected_by);

CREATE INDEX IF NOT EXISTS idx_training_programs_created_by ON public.training_programs (created_by);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_program_id ON public.training_enrollments (program_id);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON public.performance_reviews (employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON public.performance_reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_announcements_published_by ON public.announcements (published_by);
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_holidays_created_by ON public.holidays (created_by);

CREATE INDEX IF NOT EXISTS idx_department_events_created_by ON public.department_events (created_by);
CREATE INDEX IF NOT EXISTS idx_department_events_department_id ON public.department_events (department_id);

CREATE INDEX IF NOT EXISTS idx_employee_deductions_deduction_type_id ON public.employee_deductions (deduction_type_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_created_by ON public.payroll_periods (created_by);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips (employee_id);

-- 2) Stabilize user-id lookup used by RLS predicates
CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;
REVOKE ALL ON FUNCTION public.request_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_id() TO anon, authenticated, service_role;

-- 3) Rewrite existing public policies to use initplan-friendly uid expression
DO $$
DECLARE
  p RECORD;
  roles_sql TEXT;
  using_sql TEXT;
  check_sql TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%auth.uid()%')
        OR (with_check IS NOT NULL AND with_check LIKE '%auth.uid()%')
      )
    ORDER BY tablename, policyname
  LOOP
    roles_sql := array_to_string(
      ARRAY(
        SELECT CASE
          WHEN r = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r)
        END
        FROM unnest(p.roles) AS r
      ),
      ', '
    );

    using_sql := CASE
      WHEN p.qual IS NULL OR btrim(p.qual) = '' THEN ''
      ELSE format(' USING (%s)', replace(p.qual, 'auth.uid()', '(select public.request_user_id())'))
    END;

    check_sql := CASE
      WHEN p.with_check IS NULL OR btrim(p.with_check) = '' THEN ''
      ELSE format(' WITH CHECK (%s)', replace(p.with_check, 'auth.uid()', '(select public.request_user_id())'))
    END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      p.policyname,
      p.schemaname,
      p.tablename,
      lower(p.permissive),
      p.cmd,
      roles_sql,
      using_sql,
      check_sql
    );
  END LOOP;
END;
$$;

-- Source: 20260223160000_7c9d2f44-5d6f-4b8a-a981-8a2fa2d6a9b7.sql
-- Resolve function search_path security advisor warnings and consolidate overlapping permissive RLS policies

-- 1) Fix role-mutable search_path warnings
CREATE OR REPLACE FUNCTION public.normalize_username(_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(coalesce(_value, '')), '[^a-z0-9._-]+', '', 'g'),
      '^[._-]+|[._-]+$',
      '',
      'g'
    ),
    ''
  );
$$;
REVOKE ALL ON FUNCTION public.normalize_username(TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT auth.uid();
$$;
REVOKE ALL ON FUNCTION public.request_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_id() TO anon, authenticated, service_role;

-- 2) Consolidate permissive policies to one policy per table/role/action to reduce RLS policy-overlap performance warnings
DO $$
DECLARE
  t RECORD;
  g RECORD;
  roles_sql TEXT;
  using_expr TEXT;
  check_expr TEXT;
  policy_name TEXT;
BEGIN
  CREATE TEMP TABLE tmp_policy_expanded (
    tablename TEXT NOT NULL,
    policyname TEXT NOT NULL,
    roles TEXT[] NOT NULL,
    action TEXT NOT NULL,
    qual TEXT NULL,
    with_check TEXT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_policy_expanded (tablename, policyname, roles, action, qual, with_check)
  SELECT
    p.tablename,
    p.policyname,
    ARRAY(SELECT r::TEXT FROM unnest(p.roles) r),
    a.action,
    p.qual,
    p.with_check
  FROM pg_policies p
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN p.cmd = 'ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE']::TEXT[]
      ELSE ARRAY[p.cmd]::TEXT[]
    END
  ) AS a(action)
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE';

  -- Drop existing permissive policies after we snapshot them.
  FOR t IN
    SELECT DISTINCT tablename, policyname
    FROM tmp_policy_expanded
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.policyname, t.tablename);
  END LOOP;

  -- Recreate as merged action-specific permissive policies.
  FOR g IN
    SELECT tablename, roles, action
    FROM tmp_policy_expanded
    GROUP BY tablename, roles, action
    ORDER BY tablename, action
  LOOP
    roles_sql := array_to_string(
      ARRAY(
        SELECT CASE
          WHEN r = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r)
        END
        FROM unnest(g.roles) AS r
      ),
      ', '
    );

    using_expr := NULL;
    check_expr := NULL;

    IF g.action IN ('SELECT','DELETE','UPDATE') THEN
      SELECT string_agg(format('(%s)', coalesce(nullif(e.qual, ''), 'true')), ' OR ' ORDER BY e.policyname)
      INTO using_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    IF g.action IN ('INSERT','UPDATE') THEN
      SELECT string_agg(
        format('(%s)', coalesce(nullif(e.with_check, ''), nullif(e.qual, ''), 'true')),
        ' OR '
        ORDER BY e.policyname
      )
      INTO check_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    policy_name := left(
      format(
        'merged_%s_%s_%s',
        g.tablename,
        lower(g.action),
        substr(md5(g.tablename || '|' || array_to_string(g.roles, ',') || '|' || g.action), 1, 8)
      ),
      63
    );

    IF g.action = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO %s WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(check_expr, 'true')
      );
    ELSIF g.action = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true'),
        coalesce(check_expr, coalesce(using_expr, 'true'))
      );
    END IF;
  END LOOP;
END;
$$;

-- Source: 20260223173000_4c17d1d7-6b53-4c43-86aa-4be8fe57d2b8.sql
-- Normalize PUBLIC RLS policies to authenticated for HRMS application tables
-- and re-merge permissive policies to eliminate Supabase advisor overlap warnings.
DO $$
DECLARE
  t RECORD;
  g RECORD;
  roles_sql TEXT;
  using_expr TEXT;
  check_expr TEXT;
  policy_name TEXT;
BEGIN
  CREATE TEMP TABLE tmp_policy_expanded (
    tablename TEXT NOT NULL,
    policyname TEXT NOT NULL,
    roles TEXT[] NOT NULL,
    action TEXT NOT NULL,
    qual TEXT NULL,
    with_check TEXT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_policy_expanded (tablename, policyname, roles, action, qual, with_check)
  SELECT
    p.tablename,
    p.policyname,
    ARRAY(
      SELECT DISTINCT CASE
        WHEN role_name = 'public' THEN 'authenticated'
        ELSE role_name
      END
      FROM unnest(p.roles::TEXT[]) AS role_name
      ORDER BY 1
    ) AS normalized_roles,
    action_map.action,
    p.qual,
    p.with_check
  FROM pg_policies p
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN p.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::TEXT[]
      ELSE ARRAY[p.cmd]::TEXT[]
    END
  ) AS action_map(action)
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.tablename IN ('attendance', 'leave_requests', 'leave_types', 'profiles', 'user_roles');

  -- Snapshot complete; drop existing permissive policies for the target tables.
  FOR t IN
    SELECT DISTINCT tablename, policyname
    FROM tmp_policy_expanded
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.policyname, t.tablename);
  END LOOP;

  -- Recreate merged, action-specific policies with normalized roles.
  FOR g IN
    SELECT tablename, roles, action
    FROM tmp_policy_expanded
    GROUP BY tablename, roles, action
    ORDER BY tablename, action
  LOOP
    roles_sql := array_to_string(
      ARRAY(
        SELECT CASE
          WHEN r = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r)
        END
        FROM unnest(g.roles) AS r
      ),
      ', '
    );

    using_expr := NULL;
    check_expr := NULL;

    IF g.action IN ('SELECT', 'DELETE', 'UPDATE') THEN
      SELECT string_agg(format('(%s)', coalesce(nullif(e.qual, ''), 'true')), ' OR ' ORDER BY e.policyname)
      INTO using_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    IF g.action IN ('INSERT', 'UPDATE') THEN
      SELECT string_agg(
        format('(%s)', coalesce(nullif(e.with_check, ''), nullif(e.qual, ''), 'true')),
        ' OR '
        ORDER BY e.policyname
      )
      INTO check_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    policy_name := left(
      format(
        'merged_%s_%s_%s',
        g.tablename,
        lower(g.action),
        substr(md5(g.tablename || '|' || array_to_string(g.roles, ',') || '|' || g.action), 1, 8)
      ),
      63
    );

    IF g.action = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO %s WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(check_expr, 'true')
      );
    ELSIF g.action = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true'),
        coalesce(check_expr, coalesce(using_expr, 'true'))
      );
    END IF;
  END LOOP;
END;
$$;

-- Source: 20260223190000_3c91b9f6-24a7-4f5e-bf2f-d4ef61b3b7a1.sql
-- Admin/HR password reset RPC and DB-level username change guard

-- Only HR/Admin may change profile usernames (enforced at DB layer)
CREATE OR REPLACE FUNCTION public.enforce_username_admin_hr_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  requester_id UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  requester_id := auth.uid();

  -- Allow system/migration/service-role style operations where no end-user JWT is present.
  IF requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(requester_id, 'admin'::public.app_role)
     OR public.has_role(requester_id, 'hr'::public.app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only HR/Admin can change username aliases'
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_username_admin_hr_only() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zz_guard_profiles_username_update ON public.profiles;
CREATE TRIGGER zz_guard_profiles_username_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_username_admin_hr_only();

-- Admin/HR password reset for any user (server-side hash update + session invalidation)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(_target_user_id UUID, _new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  requester_id UUID;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.has_role(requester_id, 'admin'::public.app_role)
    OR public.has_role(requester_id, 'hr'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  IF pg_catalog.char_length(pg_catalog.coalesce(_new_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters'
      USING ERRCODE = '22023';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = pg_catalog.now(),
      recovery_token = '',
      recovery_sent_at = NULL,
      reauthentication_token = '',
      reauthentication_sent_at = NULL
  WHERE id = _target_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF pg_catalog.to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1'
    USING _target_user_id;
  END IF;

  IF pg_catalog.to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1'
    USING _target_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

-- Source: 20260223203000_6e63c5a4-8d2c-4f87-a9c3-1f3bf8f74f4e.sql
-- Provision leave-documents storage bucket (policies already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-documents', 'leave-documents', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- Source: 20260223213000_bf6c4d77-2e8c-4ff1-9d4c-30b94f5b4f6d.sql
-- Configurable leave approval workflows (HR/Admin managed)

CREATE TABLE IF NOT EXISTS public.leave_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_role public.app_role NOT NULL UNIQUE,
  approval_stages TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director', 'hr') THEN
      RAISE EXCEPTION 'Invalid approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  IF NEW.approval_stages[stage_count] <> 'hr' THEN
    RAISE EXCEPTION 'approval_stages must end with hr'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_leave_approval_workflows_stages ON public.leave_approval_workflows;
CREATE TRIGGER validate_leave_approval_workflows_stages
BEFORE INSERT OR UPDATE OF approval_stages
ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.validate_leave_approval_workflow_stages();

DROP TRIGGER IF EXISTS update_leave_approval_workflows_updated_at ON public.leave_approval_workflows;
CREATE TRIGGER update_leave_approval_workflows_updated_at
BEFORE UPDATE ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leave_approval_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leave approval workflows viewable by authenticated users" ON public.leave_approval_workflows;
CREATE POLICY "Leave approval workflows viewable by authenticated users"
ON public.leave_approval_workflows
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "HR and Admin can manage leave approval workflows" ON public.leave_approval_workflows;
CREATE POLICY "HR and Admin can manage leave approval workflows"
ON public.leave_approval_workflows
FOR ALL
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
);

INSERT INTO public.leave_approval_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'hr']::TEXT[], true, 'Default employee route'),
  ('manager', ARRAY['general_manager', 'hr']::TEXT[], true, 'Default manager route'),
  ('general_manager', ARRAY['general_manager', 'director', 'hr']::TEXT[], true, 'Default GM route'),
  ('director', ARRAY['hr']::TEXT[], true, 'Default director route'),
  ('hr', ARRAY['hr']::TEXT[], true, 'Default HR route'),
  ('admin', ARRAY['hr']::TEXT[], true, 'Default admin route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_approval_workflows.notes, EXCLUDED.notes);
-- Director-final leave approvals, HR/Admin view-only leave access,
-- and payroll/role RBAC realignment (admin restricted from payroll; director elevated).

CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director') THEN
      RAISE EXCEPTION 'Invalid approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  IF NEW.approval_stages[stage_count] <> 'director' THEN
    RAISE EXCEPTION 'approval_stages must end with director'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

-- Normalize existing workflow rows away from legacy hr final stage while preserving order and custom skips.
UPDATE public.leave_approval_workflows w
SET approval_stages = normalized.stages,
    updated_at = now()
FROM (
  SELECT
    lw.id,
    CASE
      WHEN array_length(filtered.stages, 1) IS NULL THEN ARRAY['director']::TEXT[]
      WHEN filtered.stages[array_length(filtered.stages, 1)] = 'director' THEN filtered.stages
      ELSE array_append(array_remove(filtered.stages, 'director'), 'director')
    END AS stages
  FROM public.leave_approval_workflows lw
  CROSS JOIN LATERAL (
    SELECT ARRAY(
      SELECT stage
      FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
      WHERE stage = ANY(coalesce(lw.approval_stages, ARRAY[]::TEXT[]))
    ) AS stages
  ) AS filtered
) AS normalized
WHERE normalized.id = w.id
  AND w.approval_stages IS DISTINCT FROM normalized.stages;

-- Reset seeded defaults to the new director-final policy (preserve custom notes when present).
INSERT INTO public.leave_approval_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'director']::TEXT[], true, 'Default employee route'),
  ('manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default manager route'),
  ('general_manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default GM route'),
  ('director', ARRAY['director']::TEXT[], true, 'Default director route'),
  ('hr', ARRAY['director']::TEXT[], true, 'Default HR route'),
  ('admin', ARRAY['director']::TEXT[], true, 'Default admin route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_approval_workflows.notes, EXCLUDED.notes);

-- Rebuild leave approval workflow RLS so Director also has unrestricted configuration access.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_approval_workflows'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leave_approval_workflows', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY leave_approval_workflows_select_authenticated
ON public.leave_approval_workflows
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY leave_approval_workflows_insert_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY leave_approval_workflows_update_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY leave_approval_workflows_delete_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- Rebuild leave_requests policies so HR/Admin are view-only (they can still create/update their own requests via employee rules).
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_requests'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leave_requests', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY leave_requests_select_authenticated
ON public.leave_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
);

CREATE POLICY leave_requests_insert_self
ON public.leave_requests
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.request_user_id()
);

CREATE POLICY leave_requests_update_workflow_and_self
ON public.leave_requests
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (employee_id = public.request_user_id() AND status = 'pending')
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR employee_id = public.request_user_id()
);

-- Rebuild user_roles policies so Admin + Director can perform CRUD, while HR/Admin/Director can read all.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_roles', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY user_roles_select_authenticated
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_insert_admin_director
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_update_admin_director
ON public.user_roles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_delete_admin_director
ON public.user_roles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- Payroll tables: admin loses payroll/salary visibility and management; HR + Director retain payroll access.
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['salary_structures', 'deduction_types', 'employee_deductions', 'payroll_periods', 'payslips'] LOOP
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END
$$;

-- salary_structures
CREATE POLICY salary_structures_select_policy
ON public.salary_structures
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_insert_policy
ON public.salary_structures
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_update_policy
ON public.salary_structures
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_delete_policy
ON public.salary_structures
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- deduction_types
CREATE POLICY deduction_types_select_policy
ON public.deduction_types
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY deduction_types_insert_policy
ON public.deduction_types
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY deduction_types_update_policy
ON public.deduction_types
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY deduction_types_delete_policy
ON public.deduction_types
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- employee_deductions
CREATE POLICY employee_deductions_select_policy
ON public.employee_deductions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_insert_policy
ON public.employee_deductions
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_update_policy
ON public.employee_deductions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_delete_policy
ON public.employee_deductions
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- payroll_periods
CREATE POLICY payroll_periods_select_policy
ON public.payroll_periods
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY payroll_periods_insert_policy
ON public.payroll_periods
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payroll_periods_update_policy
ON public.payroll_periods
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payroll_periods_delete_policy
ON public.payroll_periods
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- payslips
CREATE POLICY payslips_select_policy
ON public.payslips
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_insert_policy
ON public.payslips
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_update_policy
ON public.payslips
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_delete_policy
ON public.payslips
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);
-- Dynamic final approver for leave workflows (Director optional)
-- Adds per-request workflow snapshot and generic final approval markers.

-- Ensure leave status constraint supports multi-level statuses on environments with older checks.
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (
  status = ANY (
    ARRAY[
      'pending'::text,
      'manager_approved'::text,
      'gm_approved'::text,
      'director_approved'::text,
      'hr_approved'::text,
      'rejected'::text,
      'cancelled'::text
    ]
  )
);

-- Generic final-approval markers + frozen workflow snapshot per request.
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_route_snapshot TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS final_approved_by UUID NULL REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS final_approved_by_role public.app_role NULL;

CREATE INDEX IF NOT EXISTS idx_leave_requests_final_approved_at
  ON public.leave_requests (final_approved_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_final_approved_by
  ON public.leave_requests (final_approved_by);

-- Workflow validator: allow any non-empty canonical subset of manager/gm/director.
CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  canonical_order TEXT[] := ARRAY['manager', 'general_manager', 'director'];
  normalized_stages TEXT[];
  input_count INTEGER;
  normalized_count INTEGER;
BEGIN
  input_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF input_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(canonical_order) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_stages, ARRAY[]::TEXT[]))
  );

  normalized_count := coalesce(array_length(normalized_stages, 1), 0);

  IF normalized_count <> input_count OR NEW.approval_stages IS DISTINCT FROM normalized_stages THEN
    RAISE EXCEPTION 'approval_stages must be a unique canonical subset of (manager, general_manager, director)'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

-- Resolve the effective workflow for a leave request at creation time (snapshot source).
CREATE OR REPLACE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_requester_role public.app_role := coalesce(public.get_user_role(_employee_id), 'employee'::public.app_role);
  configured_stages TEXT[];
  normalized_stages TEXT[];
BEGIN
  SELECT w.approval_stages
  INTO configured_stages
  FROM public.leave_approval_workflows w
  WHERE w.requester_role = resolved_requester_role
    AND coalesce(w.is_active, true)
  LIMIT 1;

  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
    WHERE stage = ANY(coalesce(configured_stages, ARRAY[]::TEXT[]))
  );

  IF coalesce(array_length(normalized_stages, 1), 0) > 0 THEN
    RETURN normalized_stages;
  END IF;

  -- Fallback defaults if workflow table row is missing or inactive.
  IF resolved_requester_role = 'employee'::public.app_role THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'general_manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSE
    RETURN ARRAY['director']::TEXT[];
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) TO authenticated, service_role;

-- Stamp a workflow snapshot when the request is created.
CREATE OR REPLACE FUNCTION public.set_leave_request_workflow_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  normalized_stages TEXT[];
BEGIN
  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::TEXT[]))
  );

  IF coalesce(array_length(normalized_stages, 1), 0) = 0 THEN
    NEW.approval_route_snapshot := public.resolve_leave_request_workflow_snapshot(NEW.employee_id);
  ELSE
    NEW.approval_route_snapshot := normalized_stages;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_leave_request_workflow_snapshot() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zz_set_leave_request_workflow_snapshot ON public.leave_requests;
CREATE TRIGGER zz_set_leave_request_workflow_snapshot
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_leave_request_workflow_snapshot();

-- Backfill workflow snapshot for existing rows.
UPDATE public.leave_requests lr
SET approval_route_snapshot = public.resolve_leave_request_workflow_snapshot(lr.employee_id)
WHERE coalesce(array_length(lr.approval_route_snapshot, 1), 0) = 0;

-- Backfill generic final approval markers for legacy approved rows.
UPDATE public.leave_requests lr
SET final_approved_at = coalesce(
      lr.final_approved_at,
      lr.hr_approved_at,
      lr.director_approved_at,
      lr.gm_approved_at,
      lr.manager_approved_at,
      lr.updated_at
    ),
    final_approved_by = coalesce(
      lr.final_approved_by,
      lr.hr_approved_by,
      lr.director_approved_by,
      lr.gm_approved_by,
      lr.manager_approved_by
    ),
    final_approved_by_role = coalesce(
      lr.final_approved_by_role,
      CASE
        WHEN lr.hr_approved_by IS NOT NULL THEN coalesce(public.get_user_role(lr.hr_approved_by), 'hr'::public.app_role)
        WHEN lr.director_approved_by IS NOT NULL THEN 'director'::public.app_role
        WHEN lr.gm_approved_by IS NOT NULL THEN 'general_manager'::public.app_role
        WHEN lr.manager_approved_by IS NOT NULL THEN 'manager'::public.app_role
        ELSE NULL
      END
    )
WHERE lr.status IN ('director_approved', 'hr_approved')
  AND (
    lr.final_approved_at IS NULL
    OR lr.final_approved_by IS NULL
    OR lr.final_approved_by_role IS NULL
  );

ANALYZE public.leave_requests;


-- Source: 20260224130000_5e2f6a31-2a74-4d1d-b0c7-3d8ef21d4d90.sql
-- RBAC remediation (phase 1)
-- Aligns Admin/HR/Director responsibilities after leave/payroll workflow changes.
-- Admin remains a system supervisor (read-only on most HR ops tables), while
-- Director gets unrestricted business-operational access.

-- Drop existing public policies for targeted tables so we can recreate them with
-- explicit, stable policy names and updated role semantics.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (
        ARRAY[
          'announcements',
          'attendance',
          'department_events',
          'departments',
          'documents',
          'holidays',
          'leave_types',
          'performance_reviews',
          'profiles',
          'training_enrollments',
          'training_programs'
        ]
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- Drop only storage policies related to employee-documents / leave-documents buckets.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        position('employee-documents' in (coalesce(qual, '') || ' ' || coalesce(with_check, ''))) > 0
        OR position('leave-documents' in (coalesce(qual, '') || ' ' || coalesce(with_check, ''))) > 0
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- public.announcements
-- Admin keeps privileged read for supervision, but write access is HR/Director only.
-- ---------------------------------------------------------------------------
CREATE POLICY announcements_select_authenticated
ON public.announcements
FOR SELECT
TO authenticated
USING (
  (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_insert_hr_director
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_update_hr_director
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_delete_hr_director
ON public.announcements
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.attendance
-- Admin is read-only for supervision. Director gets org-level operational access.
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_select_authenticated
ON public.attendance
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND (
      employee_id = request_user_id()
      OR is_manager_of(request_user_id(), employee_id)
      OR is_department_manager(request_user_id(), employee_id)
    )
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND (
      employee_id = request_user_id()
      OR is_manager_of(request_user_id(), employee_id)
      OR is_department_manager(request_user_id(), employee_id)
    )
  )
);

CREATE POLICY attendance_insert_self_hr_director
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY attendance_update_self_hr_director
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY attendance_delete_hr_director
ON public.attendance
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.department_events
-- HR/Director manage globally. Managers/GM can manage their own department events.
-- Anonymous access removed.
-- ---------------------------------------------------------------------------
CREATE POLICY department_events_select_authenticated
ON public.department_events
FOR SELECT
TO authenticated
USING (
  department_id IN (
    SELECT profiles.department_id
    FROM public.profiles
    WHERE profiles.id = request_user_id()
  )
  OR department_id IS NULL
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_insert_privileged
ON public.department_events
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_update_privileged
ON public.department_events
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_delete_privileged
ON public.department_events
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

-- ---------------------------------------------------------------------------
-- public.departments
-- Admin is read-only here; HR/Director manage.
-- ---------------------------------------------------------------------------
CREATE POLICY departments_select_authenticated
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY departments_insert_hr_director
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY departments_update_hr_director
ON public.departments
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY departments_delete_hr_director
ON public.departments
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.documents
-- Admin is removed from employee-document access. Director gets unrestricted access.
-- ---------------------------------------------------------------------------
CREATE POLICY documents_select_authenticated
ON public.documents
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND is_department_manager(request_user_id(), employee_id)
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND is_department_manager(request_user_id(), employee_id)
  )
);

CREATE POLICY documents_insert_hr_director
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY documents_update_hr_director
ON public.documents
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY documents_delete_hr_director
ON public.documents
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.holidays
-- Anonymous access removed. HR/Director manage company holidays.
-- ---------------------------------------------------------------------------
CREATE POLICY holidays_select_authenticated
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY holidays_insert_hr_director
ON public.holidays
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY holidays_update_hr_director
ON public.holidays
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY holidays_delete_hr_director
ON public.holidays
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.leave_types
-- Admin becomes read-only; HR/Director manage leave policy definitions.
-- ---------------------------------------------------------------------------
CREATE POLICY leave_types_select_authenticated
ON public.leave_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY leave_types_insert_hr_director
ON public.leave_types
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY leave_types_update_hr_director
ON public.leave_types
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY leave_types_delete_hr_director
ON public.leave_types
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.performance_reviews
-- Admin read-only for supervision. HR/Director/reviewer manage review lifecycle.
-- ---------------------------------------------------------------------------
CREATE POLICY performance_reviews_select_authenticated
ON public.performance_reviews
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_insert_reviewer_hr_director
ON public.performance_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_update_reviewer_hr_director
ON public.performance_reviews
FOR UPDATE
TO authenticated
USING (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_delete_reviewer_hr_director
ON public.performance_reviews
FOR DELETE
TO authenticated
USING (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.profiles
-- Admin remains read-only + broad update access temporarily for account supervision
-- (e.g. username management), while Director is added for business-ops access.
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_authenticated
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND (
      id = request_user_id()
      OR manager_id = request_user_id()
      OR is_department_manager(request_user_id(), id)
    )
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND (
      id = request_user_id()
      OR manager_id = request_user_id()
      OR is_department_manager(request_user_id(), id)
    )
  )
);

CREATE POLICY profiles_insert_hr_director
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY profiles_update_self_hr_admin_director
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY profiles_delete_hr_director
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.training_programs
-- Admin read-only (via SELECT true). HR/Director manage programs.
-- ---------------------------------------------------------------------------
CREATE POLICY training_programs_select_authenticated
ON public.training_programs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY training_programs_insert_hr_director
ON public.training_programs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_programs_update_hr_director
ON public.training_programs
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_programs_delete_hr_director
ON public.training_programs
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.training_enrollments
-- Employees can self-enroll. Admin is read-only for supervision. HR/Director manage.
-- ---------------------------------------------------------------------------
CREATE POLICY training_enrollments_select_authenticated
ON public.training_enrollments
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_insert_self_hr_director
ON public.training_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_update_hr_director
ON public.training_enrollments
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_delete_hr_director
ON public.training_enrollments
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- storage.objects (employee-documents + leave-documents)
-- Admin removed from employee/leave document visibility. Director added where needed.
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY employee_documents_select_hr_director
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY employee_documents_insert_hr_director
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY employee_documents_delete_hr_director
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY leave_documents_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY leave_documents_select_authorized
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.is_manager_of(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.is_department_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY leave_documents_update_owner
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY leave_documents_delete_owner
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- Source: 20260224143000_7a6b1d1f-5a8d-43d0-9b6c-2f3e0c8d4a12.sql
-- Phase 2 RBAC hardening for profiles
-- Admin remains a system supervisor and can manage username aliases, but cannot
-- modify other profile fields directly. HR/Director retain broader profile edit access.

CREATE OR REPLACE FUNCTION public.enforce_profiles_admin_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_id uuid;
  old_filtered jsonb;
  new_filtered jsonb;
BEGIN
  actor_id := public.request_user_id();

  -- Allow backend/migration contexts with no request user.
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- HR and Director keep full profile update capability (subject to RLS row checks).
  IF public.has_role(actor_id, 'hr'::public.app_role)
     OR public.has_role(actor_id, 'director'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Admin can only change username alias. Ignore updated_at because it is changed
  -- by the standard timestamp trigger on every update.
  IF public.has_role(actor_id, 'admin'::public.app_role) THEN
    old_filtered := to_jsonb(OLD) - 'username' - 'updated_at';
    new_filtered := to_jsonb(NEW) - 'username' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Admin can only update username aliases from this endpoint.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_guard_profiles_admin_update_scope ON public.profiles;

CREATE TRIGGER zz_guard_profiles_admin_update_scope
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profiles_admin_update_scope();


-- Migration: 20260224183000_5f2d8b1a-6b6c-4d72-bf54-f6ec75afab91

-- Allow employees to cancel pending leave or request cancellation after final approval
-- without widening direct UPDATE RLS on public.leave_requests.

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN;
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.status <> 'pending' AND request_row.final_approved_at IS NULL THEN
    RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.leave_requests
  SET status = 'cancelled'
  WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID) TO authenticated, service_role;


-- Migration: 20260224213000_8d3f9c21-7b8f-4f7f-932f-8e7c4aa5c201

-- Leave cancellation workflow (request + approval), with configurable routes

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS cancellation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_route_snapshot TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_comments TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_manager_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_manager_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_gm_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_gm_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_director_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_director_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_by_role public.app_role NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejected_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_role public.app_role NULL;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_cancellation_status_check;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_cancellation_status_check
  CHECK (
    cancellation_status IS NULL
    OR cancellation_status IN (
      'pending',
      'manager_approved',
      'gm_approved',
      'director_approved',
      'approved',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancellation_status
  ON public.leave_requests (cancellation_status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancellation_requested_at
  ON public.leave_requests (cancellation_requested_at);

CREATE TABLE IF NOT EXISTS public.leave_cancellation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_role public.app_role NOT NULL UNIQUE,
  approval_stages TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_leave_cancellation_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director') THEN
      RAISE EXCEPTION 'Invalid cancellation approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate cancellation approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_cancellation_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_leave_cancellation_workflows_stages ON public.leave_cancellation_workflows;
CREATE TRIGGER validate_leave_cancellation_workflows_stages
BEFORE INSERT OR UPDATE OF approval_stages
ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.validate_leave_cancellation_workflow_stages();

DROP TRIGGER IF EXISTS update_leave_cancellation_workflows_updated_at ON public.leave_cancellation_workflows;
CREATE TRIGGER update_leave_cancellation_workflows_updated_at
BEFORE UPDATE ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leave_cancellation_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_cancellation_workflows_select_authenticated ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_select_authenticated
ON public.leave_cancellation_workflows
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_cancellation_workflows_insert_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_insert_privileged
ON public.leave_cancellation_workflows
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

DROP POLICY IF EXISTS leave_cancellation_workflows_update_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_update_privileged
ON public.leave_cancellation_workflows
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

DROP POLICY IF EXISTS leave_cancellation_workflows_delete_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_delete_privileged
ON public.leave_cancellation_workflows
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

INSERT INTO public.leave_cancellation_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'director']::TEXT[], true, 'Default employee cancellation route'),
  ('manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default manager cancellation route'),
  ('general_manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default GM cancellation route'),
  ('director', ARRAY['director']::TEXT[], true, 'Default director cancellation route'),
  ('hr', ARRAY['director']::TEXT[], true, 'Default HR cancellation route'),
  ('admin', ARRAY['director']::TEXT[], true, 'Default admin cancellation route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_cancellation_workflows.notes, EXCLUDED.notes);

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  requester_role_value public.app_role := 'employee';
  raw_route TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
  now_ts TIMESTAMPTZ := now();
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN 'already_cancelled';
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  -- Pending leave can be self-cancelled immediately.
  IF request_row.final_approved_at IS NULL THEN
    IF request_row.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancelled_at = now_ts,
        cancelled_by = requester_id,
        cancelled_by_role = COALESCE(public.get_user_role(requester_id), 'employee'::public.app_role),
        cancellation_status = NULL,
        cancellation_route_snapshot = NULL,
        cancellation_requested_at = NULL,
        cancellation_requested_by = NULL,
        cancellation_reason = NULL,
        cancellation_comments = NULL,
        cancellation_manager_approved_at = NULL,
        cancellation_manager_approved_by = NULL,
        cancellation_gm_approved_at = NULL,
        cancellation_gm_approved_by = NULL,
        cancellation_director_approved_at = NULL,
        cancellation_director_approved_by = NULL,
        cancellation_final_approved_at = NULL,
        cancellation_final_approved_by = NULL,
        cancellation_final_approved_by_role = NULL,
        cancellation_rejected_at = NULL,
        cancellation_rejected_by = NULL,
        cancellation_rejection_reason = NULL
    WHERE id = _request_id;

    RETURN 'cancelled';
  END IF;

  IF request_row.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
    RAISE EXCEPTION 'A cancellation request is already in progress'
      USING ERRCODE = '23505';
  END IF;

  requester_role_value := COALESCE(public.get_user_role(request_row.employee_id), 'employee'::public.app_role);

  SELECT approval_stages
  INTO raw_route
  FROM public.leave_cancellation_workflows
  WHERE leave_cancellation_workflows.requester_role = requester_role_value
    AND is_active = true;

  IF raw_route IS NULL OR coalesce(array_length(raw_route, 1), 0) = 0 THEN
    raw_route := CASE requester_role_value
      WHEN 'employee' THEN ARRAY['manager', 'general_manager', 'director']::TEXT[]
      WHEN 'manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      WHEN 'general_manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      ELSE ARRAY['director']::TEXT[]
    END;
  END IF;

  IF 'manager' = ANY(raw_route) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(raw_route) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(raw_route) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    route := ARRAY['director']::TEXT[];
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = route,
      cancellation_requested_at = now_ts,
      cancellation_requested_by = requester_id,
      cancellation_reason = NULLIF(pg_catalog.btrim(COALESCE(_reason, '')), ''),
      cancellation_comments = NULL,
      cancellation_manager_approved_at = NULL,
      cancellation_manager_approved_by = NULL,
      cancellation_gm_approved_at = NULL,
      cancellation_gm_approved_by = NULL,
      cancellation_director_approved_at = NULL,
      cancellation_director_approved_by = NULL,
      cancellation_final_approved_at = NULL,
      cancellation_final_approved_by = NULL,
      cancellation_final_approved_by_role = NULL,
      cancellation_rejected_at = NULL,
      cancellation_rejected_by = NULL,
      cancellation_rejection_reason = NULL
  WHERE id = _request_id;

  RETURN 'requested';
END;
$$;

DROP FUNCTION IF EXISTS public.request_leave_cancellation(UUID);
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_requests;
ANALYZE public.leave_cancellation_workflows;
-- Department-scoped leave approval/cancellation workflows with global fallback

ALTER TABLE public.leave_approval_workflows
  ADD COLUMN IF NOT EXISTS department_id UUID NULL;

ALTER TABLE public.leave_cancellation_workflows
  ADD COLUMN IF NOT EXISTS department_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_approval_workflows_department_id_fkey'
  ) THEN
    ALTER TABLE public.leave_approval_workflows
      ADD CONSTRAINT leave_approval_workflows_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_cancellation_workflows_department_id_fkey'
  ) THEN
    ALTER TABLE public.leave_cancellation_workflows
      ADD CONSTRAINT leave_cancellation_workflows_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.leave_approval_workflows
  DROP CONSTRAINT IF EXISTS leave_approval_workflows_requester_role_key;

ALTER TABLE public.leave_cancellation_workflows
  DROP CONSTRAINT IF EXISTS leave_cancellation_workflows_requester_role_key;

CREATE INDEX IF NOT EXISTS idx_leave_approval_workflows_department_id
  ON public.leave_approval_workflows (department_id);

CREATE INDEX IF NOT EXISTS idx_leave_cancellation_workflows_department_id
  ON public.leave_cancellation_workflows (department_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_approval_workflows_global_role
  ON public.leave_approval_workflows (requester_role)
  WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_approval_workflows_department_role
  ON public.leave_approval_workflows (department_id, requester_role)
  WHERE department_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_cancellation_workflows_global_role
  ON public.leave_cancellation_workflows (requester_role)
  WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_cancellation_workflows_department_role
  ON public.leave_cancellation_workflows (department_id, requester_role)
  WHERE department_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_requester_role public.app_role := 'employee'::public.app_role;
  employee_department_id UUID;
  configured_workflow TEXT[];
BEGIN
  IF _employee_id IS NULL THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  SELECT COALESCE(public.get_user_role(_employee_id), 'employee'::public.app_role)
  INTO resolved_requester_role;

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = _employee_id;

  SELECT w.approval_stages
  INTO configured_workflow
  FROM public.leave_approval_workflows w
  WHERE w.requester_role = resolved_requester_role
    AND w.is_active = true
    AND (
      w.department_id IS NULL
      OR w.department_id = employee_department_id
    )
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF coalesce(array_length(configured_workflow, 1), 0) > 0 THEN
    RETURN ARRAY(
      SELECT stage
      FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
      WHERE stage = ANY(configured_workflow)
    );
  END IF;

  IF resolved_requester_role = 'employee'::public.app_role THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'general_manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSE
    RETURN ARRAY['director']::TEXT[];
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  requester_role_value public.app_role := 'employee';
  employee_department_id UUID;
  raw_route TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
  now_ts TIMESTAMPTZ := now();
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN 'already_cancelled';
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NULL THEN
    IF request_row.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancelled_at = now_ts,
        cancelled_by = requester_id,
        cancelled_by_role = COALESCE(public.get_user_role(requester_id), 'employee'::public.app_role),
        cancellation_status = NULL,
        cancellation_route_snapshot = NULL,
        cancellation_requested_at = NULL,
        cancellation_requested_by = NULL,
        cancellation_reason = NULL,
        cancellation_comments = NULL,
        cancellation_manager_approved_at = NULL,
        cancellation_manager_approved_by = NULL,
        cancellation_gm_approved_at = NULL,
        cancellation_gm_approved_by = NULL,
        cancellation_director_approved_at = NULL,
        cancellation_director_approved_by = NULL,
        cancellation_final_approved_at = NULL,
        cancellation_final_approved_by = NULL,
        cancellation_final_approved_by_role = NULL,
        cancellation_rejected_at = NULL,
        cancellation_rejected_by = NULL,
        cancellation_rejection_reason = NULL
    WHERE id = _request_id;

    RETURN 'cancelled';
  END IF;

  IF request_row.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
    RAISE EXCEPTION 'A cancellation request is already in progress'
      USING ERRCODE = '23505';
  END IF;

  requester_role_value := COALESCE(public.get_user_role(request_row.employee_id), 'employee'::public.app_role);

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = request_row.employee_id;

  SELECT w.approval_stages
  INTO raw_route
  FROM public.leave_cancellation_workflows w
  WHERE w.requester_role = requester_role_value
    AND w.is_active = true
    AND (
      w.department_id IS NULL
      OR w.department_id = employee_department_id
    )
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF raw_route IS NULL OR coalesce(array_length(raw_route, 1), 0) = 0 THEN
    raw_route := CASE requester_role_value
      WHEN 'employee' THEN ARRAY['manager', 'general_manager', 'director']::TEXT[]
      WHEN 'manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      WHEN 'general_manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      ELSE ARRAY['director']::TEXT[]
    END;
  END IF;

  IF 'manager' = ANY(raw_route) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(raw_route) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(raw_route) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    route := ARRAY['director']::TEXT[];
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = route,
      cancellation_requested_at = now_ts,
      cancellation_requested_by = requester_id,
      cancellation_reason = NULLIF(pg_catalog.btrim(COALESCE(_reason, '')), ''),
      cancellation_comments = NULL,
      cancellation_manager_approved_at = NULL,
      cancellation_manager_approved_by = NULL,
      cancellation_gm_approved_at = NULL,
      cancellation_gm_approved_by = NULL,
      cancellation_director_approved_at = NULL,
      cancellation_director_approved_by = NULL,
      cancellation_final_approved_at = NULL,
      cancellation_final_approved_by = NULL,
      cancellation_final_approved_by_role = NULL,
      cancellation_rejected_at = NULL,
      cancellation_rejected_by = NULL,
      cancellation_rejection_reason = NULL
  WHERE id = _request_id;

  RETURN 'requested';
END;
$$;
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_approval_workflows;
ANALYZE public.leave_cancellation_workflows;
-- Revamp leave approval workflows to department-based profiles (single shared route per department)
-- Keep schema backward-compatible by retaining requester_role column and using requester_role='employee' as the canonical row.

DO $$
DECLARE
  scope_row record;
BEGIN
  -- Ensure one canonical approval workflow row exists per scope (global + department), using
  -- the best available legacy row if an employee-scoped row is missing.
  FOR scope_row IN
    SELECT DISTINCT department_id
    FROM public.leave_approval_workflows
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.leave_approval_workflows w
      WHERE w.requester_role = 'employee'
        AND w.department_id IS NOT DISTINCT FROM scope_row.department_id
    ) THEN
      INSERT INTO public.leave_approval_workflows (
        requester_role,
        department_id,
        approval_stages,
        is_active,
        notes
      )
      SELECT
        'employee',
        scope_row.department_id,
        w.approval_stages,
        coalesce(w.is_active, true),
        coalesce(w.notes, 'Migrated from legacy requester-role workflow profile')
      FROM public.leave_approval_workflows w
      WHERE w.department_id IS NOT DISTINCT FROM scope_row.department_id
      ORDER BY
        CASE w.requester_role
          WHEN 'employee' THEN 0
          WHEN 'manager' THEN 1
          WHEN 'general_manager' THEN 2
          WHEN 'director' THEN 3
          WHEN 'hr' THEN 4
          WHEN 'admin' THEN 5
          ELSE 6
        END,
        w.created_at ASC
      LIMIT 1;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_approval_workflows
    WHERE requester_role = 'employee'
      AND department_id IS NULL
  ) THEN
    INSERT INTO public.leave_approval_workflows (
      requester_role,
      department_id,
      approval_stages,
      is_active,
      notes
    ) VALUES (
      'employee',
      NULL,
      ARRAY['manager', 'general_manager', 'director']::text[],
      true,
      'Default global department approval route'
    );
  END IF;

  -- Repeat the same normalization for cancellation workflows.
  FOR scope_row IN
    SELECT DISTINCT department_id
    FROM public.leave_cancellation_workflows
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.leave_cancellation_workflows w
      WHERE w.requester_role = 'employee'
        AND w.department_id IS NOT DISTINCT FROM scope_row.department_id
    ) THEN
      INSERT INTO public.leave_cancellation_workflows (
        requester_role,
        department_id,
        approval_stages,
        is_active,
        notes
      )
      SELECT
        'employee',
        scope_row.department_id,
        w.approval_stages,
        coalesce(w.is_active, true),
        coalesce(w.notes, 'Migrated from legacy requester-role cancellation workflow profile')
      FROM public.leave_cancellation_workflows w
      WHERE w.department_id IS NOT DISTINCT FROM scope_row.department_id
      ORDER BY
        CASE w.requester_role
          WHEN 'employee' THEN 0
          WHEN 'manager' THEN 1
          WHEN 'general_manager' THEN 2
          WHEN 'director' THEN 3
          WHEN 'hr' THEN 4
          WHEN 'admin' THEN 5
          ELSE 6
        END,
        w.created_at ASC
      LIMIT 1;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_cancellation_workflows
    WHERE requester_role = 'employee'
      AND department_id IS NULL
  ) THEN
    INSERT INTO public.leave_cancellation_workflows (
      requester_role,
      department_id,
      approval_stages,
      is_active,
      notes
    ) VALUES (
      'employee',
      NULL,
      ARRAY['manager', 'general_manager', 'director']::text[],
      true,
      'Default global department cancellation route'
    );
  END IF;
END;
$$;

-- Remove legacy requester-role-specific workflow rows. The app and DB now use the employee row
-- as the shared department workflow profile.
DELETE FROM public.leave_approval_workflows
WHERE requester_role <> 'employee';

DELETE FROM public.leave_cancellation_workflows
WHERE requester_role <> 'employee';

CREATE OR REPLACE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_requester_role public.app_role := 'employee'::public.app_role;
  employee_department_id UUID;
  configured_workflow TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF _employee_id IS NULL THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  SELECT COALESCE(public.get_user_role(_employee_id), 'employee'::public.app_role)
  INTO resolved_requester_role;

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = _employee_id;

  SELECT w.approval_stages
  INTO configured_workflow
  FROM public.leave_approval_workflows w
  WHERE w.requester_role = 'employee'::public.app_role
    AND w.is_active = true
    AND (w.department_id IS NULL OR w.department_id = employee_department_id)
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF configured_workflow IS NULL OR coalesce(array_length(configured_workflow, 1), 0) = 0 THEN
    configured_workflow := ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  IF 'manager' = ANY(configured_workflow)
     AND resolved_requester_role NOT IN ('manager'::public.app_role, 'general_manager'::public.app_role, 'director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(configured_workflow)
     AND resolved_requester_role NOT IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(configured_workflow) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    IF resolved_requester_role IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
      RETURN ARRAY['director']::TEXT[];
    ELSIF resolved_requester_role IN ('manager'::public.app_role, 'general_manager'::public.app_role) THEN
      RETURN ARRAY['general_manager', 'director']::TEXT[];
    END IF;

    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  RETURN route;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  requester_role_value public.app_role := 'employee';
  employee_department_id UUID;
  raw_route TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
  now_ts TIMESTAMPTZ := now();
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN 'already_cancelled';
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NULL THEN
    IF request_row.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancelled_at = now_ts,
        cancelled_by = requester_id,
        cancelled_by_role = COALESCE(public.get_user_role(requester_id), 'employee'::public.app_role),
        cancellation_status = NULL,
        cancellation_route_snapshot = NULL,
        cancellation_requested_at = NULL,
        cancellation_requested_by = NULL,
        cancellation_reason = NULL,
        cancellation_comments = NULL,
        cancellation_manager_approved_at = NULL,
        cancellation_manager_approved_by = NULL,
        cancellation_gm_approved_at = NULL,
        cancellation_gm_approved_by = NULL,
        cancellation_director_approved_at = NULL,
        cancellation_director_approved_by = NULL,
        cancellation_final_approved_at = NULL,
        cancellation_final_approved_by = NULL,
        cancellation_final_approved_by_role = NULL,
        cancellation_rejected_at = NULL,
        cancellation_rejected_by = NULL,
        cancellation_rejection_reason = NULL
    WHERE id = _request_id;

    RETURN 'cancelled';
  END IF;

  IF request_row.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
    RAISE EXCEPTION 'A cancellation request is already in progress'
      USING ERRCODE = '23505';
  END IF;

  requester_role_value := COALESCE(public.get_user_role(request_row.employee_id), 'employee'::public.app_role);

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = request_row.employee_id;

  SELECT w.approval_stages
  INTO raw_route
  FROM public.leave_cancellation_workflows w
  WHERE w.requester_role = 'employee'::public.app_role
    AND w.is_active = true
    AND (
      w.department_id IS NULL
      OR w.department_id = employee_department_id
    )
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF raw_route IS NULL OR coalesce(array_length(raw_route, 1), 0) = 0 THEN
    raw_route := ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  IF 'manager' = ANY(raw_route)
     AND requester_role_value NOT IN ('manager'::public.app_role, 'general_manager'::public.app_role, 'director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(raw_route)
     AND requester_role_value NOT IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(raw_route) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    IF requester_role_value IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
      route := ARRAY['director']::TEXT[];
    ELSIF requester_role_value IN ('manager'::public.app_role, 'general_manager'::public.app_role) THEN
      route := ARRAY['general_manager', 'director']::TEXT[];
    ELSE
      route := ARRAY['manager', 'general_manager', 'director']::TEXT[];
    END IF;
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = route,
      cancellation_requested_at = now_ts,
      cancellation_requested_by = requester_id,
      cancellation_reason = NULLIF(btrim(_reason), ''),
      cancellation_comments = NULL,
      cancellation_manager_approved_at = NULL,
      cancellation_manager_approved_by = NULL,
      cancellation_gm_approved_at = NULL,
      cancellation_gm_approved_by = NULL,
      cancellation_director_approved_at = NULL,
      cancellation_director_approved_by = NULL,
      cancellation_final_approved_at = NULL,
      cancellation_final_approved_by = NULL,
      cancellation_final_approved_by_role = NULL,
      cancellation_rejected_at = NULL,
      cancellation_rejected_by = NULL,
      cancellation_rejection_reason = NULL
  WHERE id = _request_id;

  RETURN 'requested';
END;
$$;
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_approval_workflows;
ANALYZE public.leave_cancellation_workflows;
-- Calendar-safe leave feed for all authenticated users (without widening leave_requests table SELECT)

CREATE OR REPLACE FUNCTION public.get_calendar_visible_leaves(
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  id UUID,
  start_date DATE,
  end_date DATE,
  status TEXT,
  final_approved_at TIMESTAMPTZ,
  employee_first_name TEXT,
  employee_last_name TEXT,
  leave_type_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF public.request_user_id() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _start_date IS NULL OR _end_date IS NULL THEN
    RAISE EXCEPTION 'Start and end dates are required'
      USING ERRCODE = '22004';
  END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.start_date,
    lr.end_date,
    lr.status,
    lr.final_approved_at,
    p.first_name AS employee_first_name,
    p.last_name AS employee_last_name,
    lt.name AS leave_type_name
  FROM public.leave_requests lr
  JOIN public.profiles p
    ON p.id = lr.employee_id
  JOIN public.leave_types lt
    ON lt.id = lr.leave_type_id
  WHERE lr.final_approved_at IS NOT NULL
    AND lr.status NOT IN ('cancelled', 'rejected')
    AND lr.start_date <= _end_date
    AND lr.end_date >= _start_date
  ORDER BY lr.start_date ASC, p.first_name ASC, p.last_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_calendar_visible_leaves(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_visible_leaves(DATE, DATE) TO authenticated, service_role;

ANALYZE public.leave_requests;


-- Phase 4: leave/cancellation state-machine hardening (DB invariants)

CREATE OR REPLACE FUNCTION public.enforce_leave_request_state_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  canonical_stages text[] := ARRAY['manager', 'general_manager', 'director']::text[];
  normalized_approval_route text[] := NULL;
  normalized_cancellation_route text[] := NULL;
  final_triplet_count int := 0;
  cancelled_triplet_count int := 0;
  cancellation_final_triplet_count int := 0;
  cancellation_reject_pair_count int := 0;
  cancellation_request_core_count int := 0;
BEGIN
  -- Route snapshots must be canonical (ordered, unique, valid stages only).
  IF NEW.approval_route_snapshot IS NOT NULL THEN
    normalized_approval_route := ARRAY(
      SELECT stage
      FROM unnest(canonical_stages) AS stage
      WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]))
    );

    IF normalized_approval_route IS DISTINCT FROM NEW.approval_route_snapshot THEN
      RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot must contain unique canonical stages in fixed order'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.cancellation_route_snapshot IS NOT NULL THEN
    normalized_cancellation_route := ARRAY(
      SELECT stage
      FROM unnest(canonical_stages) AS stage
      WHERE stage = ANY(coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]))
    );

    IF normalized_cancellation_route IS DISTINCT FROM NEW.cancellation_route_snapshot THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation_route_snapshot must contain unique canonical stages in fixed order'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Core approval finalization metadata must be all-or-none.
  final_triplet_count :=
    (CASE WHEN NEW.final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.final_approved_by_role IS NOT NULL
     AND NEW.final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  -- Cancellation completion metadata must be all-or-none.
  cancelled_triplet_count :=
    (CASE WHEN NEW.cancelled_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancelled_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancelled_by_role IS NOT NULL
     AND NEW.cancelled_by_role::text NOT IN ('employee', 'manager', 'general_manager', 'director', 'hr', 'admin')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled_by_role must be a valid application role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_final_triplet_count :=
    (CASE WHEN NEW.cancellation_final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancellation_final_approved_by_role IS NOT NULL
     AND NEW.cancellation_final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation_final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_reject_pair_count :=
    (CASE WHEN NEW.cancellation_rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_rejected_by IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_reject_pair_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Rejection metadata consistency for base leave request.
  IF ((CASE WHEN NEW.rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.rejected_by IS NOT NULL THEN 1 ELSE 0 END)) NOT IN (0, 2)
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: leave rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Final-approved rows should never be pending or rejected.
  IF NEW.final_approved_at IS NOT NULL AND NEW.status IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'leave_requests state invariant: final-approved leave cannot have pending/rejected status'
      USING ERRCODE = '22023';
  END IF;

  -- Status-specific core requirements.
  IF NEW.status = 'pending' THEN
    IF NEW.manager_approved_at IS NOT NULL
       OR NEW.manager_approved_by IS NOT NULL
       OR NEW.gm_approved_at IS NOT NULL
       OR NEW.gm_approved_by IS NOT NULL
       OR NEW.director_approved_at IS NOT NULL
       OR NEW.director_approved_by IS NOT NULL
       OR NEW.hr_approved_at IS NOT NULL
       OR NEW.hr_approved_by IS NOT NULL
       OR NEW.rejected_at IS NOT NULL
       OR NEW.rejected_by IS NOT NULL
       OR NEW.cancelled_at IS NOT NULL
       OR NEW.cancelled_by IS NOT NULL
       OR NEW.final_approved_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: pending leave cannot carry approval/rejection/cancellation stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'manager_approved' THEN
    IF NEW.manager_approved_at IS NULL OR NEW.manager_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status requires manager approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'gm_approved' THEN
    IF NEW.gm_approved_at IS NULL OR NEW.gm_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status requires GM approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'director_approved' THEN
    IF NEW.director_approved_at IS NULL OR NEW.director_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status requires director approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'hr_approved' THEN
    IF NEW.hr_approved_at IS NULL OR NEW.hr_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status requires HR approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.rejected_at IS NULL OR NEW.rejected_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected status requires rejection stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have final approval metadata'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.cancellation_status IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_at IS NULL OR NEW.cancelled_by IS NULL OR NEW.cancelled_by_role IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancelled status requires cancelled_at/cancelled_by/cancelled_by_role'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.status <> 'cancelled' AND cancelled_triplet_count <> 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata may only be present when status is cancelled'
      USING ERRCODE = '22023';
  END IF;

  -- Approval route snapshot should exist once a request leaves the initial pending state, is final-approved,
  -- or enters a cancellation workflow.
  IF (
    NEW.status <> 'pending'
    OR NEW.final_approved_at IS NOT NULL
    OR NEW.cancellation_status IS NOT NULL
  ) AND coalesce(array_length(NEW.approval_route_snapshot, 1), 0) = 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot is required for non-pending or final/cancellation states'
      USING ERRCODE = '22023';
  END IF;

  -- If not final approved, there must be no cancellation workflow state.
  IF NEW.final_approved_at IS NULL AND (
    NEW.cancellation_status IS NOT NULL
    OR NEW.cancellation_route_snapshot IS NOT NULL
    OR NEW.cancellation_requested_at IS NOT NULL
    OR NEW.cancellation_requested_by IS NOT NULL
    OR NEW.cancellation_reason IS NOT NULL
    OR NEW.cancellation_comments IS NOT NULL
    OR NEW.cancellation_manager_approved_at IS NOT NULL
    OR NEW.cancellation_manager_approved_by IS NOT NULL
    OR NEW.cancellation_gm_approved_at IS NOT NULL
    OR NEW.cancellation_gm_approved_by IS NOT NULL
    OR NEW.cancellation_director_approved_at IS NOT NULL
    OR NEW.cancellation_director_approved_by IS NOT NULL
    OR NEW.cancellation_final_approved_at IS NOT NULL
    OR NEW.cancellation_final_approved_by IS NOT NULL
    OR NEW.cancellation_final_approved_by_role IS NOT NULL
    OR NEW.cancellation_rejected_at IS NOT NULL
    OR NEW.cancellation_rejected_by IS NOT NULL
    OR NEW.cancellation_rejection_reason IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation workflow data requires a final-approved leave request'
      USING ERRCODE = '22023';
  END IF;

  cancellation_request_core_count :=
    (CASE WHEN NEW.cancellation_requested_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_requested_by IS NOT NULL THEN 1 ELSE 0 END);

  IF NEW.cancellation_status IS NULL THEN
    IF NEW.cancellation_route_snapshot IS NOT NULL
       OR NEW.cancellation_requested_at IS NOT NULL
       OR NEW.cancellation_requested_by IS NOT NULL
       OR NEW.cancellation_reason IS NOT NULL
       OR NEW.cancellation_comments IS NOT NULL
       OR NEW.cancellation_manager_approved_at IS NOT NULL
       OR NEW.cancellation_manager_approved_by IS NOT NULL
       OR NEW.cancellation_gm_approved_at IS NOT NULL
       OR NEW.cancellation_gm_approved_by IS NOT NULL
       OR NEW.cancellation_director_approved_at IS NOT NULL
       OR NEW.cancellation_director_approved_by IS NOT NULL
       OR NEW.cancellation_final_approved_at IS NOT NULL
       OR NEW.cancellation_final_approved_by IS NOT NULL
       OR NEW.cancellation_final_approved_by_role IS NOT NULL
       OR NEW.cancellation_rejected_at IS NOT NULL
       OR NEW.cancellation_rejected_by IS NOT NULL
       OR NEW.cancellation_rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation fields must be cleared when cancellation_status is NULL'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    IF coalesce(array_length(NEW.cancellation_route_snapshot, 1), 0) = 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation_route_snapshot is required when cancellation_status is set'
        USING ERRCODE = '22023';
    END IF;

    IF cancellation_request_core_count <> 2 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation request metadata must include requester and timestamp'
        USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'rejected' THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot carry cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;

    IF NEW.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot exist on cancelled leave'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'manager_approved' AND (
        NEW.cancellation_manager_approved_at IS NULL OR NEW.cancellation_manager_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status requires manager approval stamps'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'gm_approved' AND (
        NEW.cancellation_gm_approved_at IS NULL OR NEW.cancellation_gm_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status requires GM approval stamps'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'director_approved' AND (
        NEW.cancellation_director_approved_at IS NULL OR NEW.cancellation_director_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: director_approved cancellation status requires director approval stamps'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_triplet_count <> 0
         OR cancellation_reject_pair_count <> 0
         OR NEW.cancellation_rejection_reason IS NOT NULL
         OR cancelled_triplet_count <> 0
      THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot contain final/rejected/cancelled stamps'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'approved' THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation_status=approved requires status=cancelled'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires final cancellation approval metadata'
          USING ERRCODE = '22023';
      END IF;

      IF cancelled_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires cancelled metadata'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_reject_pair_count <> 0 OR NEW.cancellation_rejection_reason IS NOT NULL THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state cannot contain rejection metadata'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'rejected' THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot have cancelled leave status'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_reject_pair_count <> 2 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state requires rejection metadata'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_triplet_count <> 0 OR cancelled_triplet_count <> 0 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot contain final cancellation/cancelled metadata'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_enforce_leave_request_state_consistency ON public.leave_requests;

CREATE TRIGGER zzz_enforce_leave_request_state_consistency
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_state_consistency();

-- Backfill legacy approved+cancelled rows that were created before the explicit cancellation workflow model.
UPDATE public.leave_requests lr
SET cancellation_status = 'approved',
    cancellation_route_snapshot = coalesce(lr.cancellation_route_snapshot, lr.approval_route_snapshot),
    cancellation_requested_at = coalesce(lr.cancellation_requested_at, lr.cancelled_at),
    cancellation_requested_by = coalesce(lr.cancellation_requested_by, lr.employee_id),
    cancellation_final_approved_at = coalesce(lr.cancellation_final_approved_at, lr.cancelled_at),
    cancellation_final_approved_by = coalesce(lr.cancellation_final_approved_by, lr.cancelled_by),
    cancellation_final_approved_by_role = coalesce(lr.cancellation_final_approved_by_role, lr.cancelled_by_role)
WHERE lr.status = 'cancelled'
  AND lr.final_approved_at IS NOT NULL
  AND lr.cancellation_status IS NULL
  AND lr.cancelled_at IS NOT NULL
  AND lr.cancelled_by IS NOT NULL
  AND lr.cancelled_by_role IS NOT NULL;


-- Phase 4B: route-aware leave/cancellation invariants + DB-side normalization

CREATE OR REPLACE FUNCTION public.normalize_leave_request_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  canonical_stages text[] := ARRAY['manager', 'general_manager', 'director']::text[];
  normalized_approval_route text[] := NULL;
  normalized_cancellation_route text[] := NULL;
BEGIN
  -- Trim optional text fields and normalize empty strings to NULL.
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := btrim(NEW.reason);
  END IF;
  NEW.document_url := NULLIF(btrim(coalesce(NEW.document_url, '')), '');
  NEW.manager_comments := NULLIF(btrim(coalesce(NEW.manager_comments, '')), '');
  NEW.amendment_notes := NULLIF(btrim(coalesce(NEW.amendment_notes, '')), '');
  NEW.rejection_reason := NULLIF(btrim(coalesce(NEW.rejection_reason, '')), '');
  NEW.cancellation_reason := NULLIF(btrim(coalesce(NEW.cancellation_reason, '')), '');
  NEW.cancellation_comments := NULLIF(btrim(coalesce(NEW.cancellation_comments, '')), '');
  NEW.cancellation_rejection_reason := NULLIF(btrim(coalesce(NEW.cancellation_rejection_reason, '')), '');

  -- Canonicalize route snapshots (valid stages only, unique, fixed order).
  normalized_approval_route := ARRAY(
    SELECT stage
    FROM unnest(canonical_stages) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]))
  );
  NEW.approval_route_snapshot := CASE
    WHEN coalesce(array_length(normalized_approval_route, 1), 0) = 0 THEN NULL
    ELSE normalized_approval_route
  END;

  normalized_cancellation_route := ARRAY(
    SELECT stage
    FROM unnest(canonical_stages) AS stage
    WHERE stage = ANY(coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]))
  );
  NEW.cancellation_route_snapshot := CASE
    WHEN coalesce(array_length(normalized_cancellation_route, 1), 0) = 0 THEN NULL
    ELSE normalized_cancellation_route
  END;

  -- Normalize legacy "approved then cancelled" rows into explicit cancellation workflow completion.
  IF NEW.status = 'cancelled'
     AND NEW.final_approved_at IS NOT NULL
     AND NEW.cancellation_status IS NULL
     AND NEW.cancelled_at IS NOT NULL
     AND NEW.cancelled_by IS NOT NULL
     AND NEW.cancelled_by_role IS NOT NULL
  THEN
    NEW.cancellation_status := 'approved';
    NEW.cancellation_route_snapshot := coalesce(NEW.cancellation_route_snapshot, NEW.approval_route_snapshot);
    NEW.cancellation_requested_at := coalesce(NEW.cancellation_requested_at, NEW.cancelled_at);
    NEW.cancellation_requested_by := coalesce(NEW.cancellation_requested_by, NEW.employee_id);
    NEW.cancellation_final_approved_at := coalesce(NEW.cancellation_final_approved_at, NEW.cancelled_at);
    NEW.cancellation_final_approved_by := coalesce(NEW.cancellation_final_approved_by, NEW.cancelled_by);
    NEW.cancellation_final_approved_by_role := coalesce(NEW.cancellation_final_approved_by_role, NEW.cancelled_by_role);

    -- Backfill stage-specific cancellation approval stamps for legacy rows so route-aware invariants can pass.
    CASE coalesce(NEW.cancellation_final_approved_by_role::text, NEW.cancelled_by_role::text)
      WHEN 'manager' THEN
        NEW.cancellation_manager_approved_at := coalesce(NEW.cancellation_manager_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_manager_approved_by := coalesce(NEW.cancellation_manager_approved_by, NEW.cancellation_final_approved_by);
      WHEN 'general_manager' THEN
        NEW.cancellation_gm_approved_at := coalesce(NEW.cancellation_gm_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_gm_approved_by := coalesce(NEW.cancellation_gm_approved_by, NEW.cancellation_final_approved_by);
      WHEN 'director' THEN
        NEW.cancellation_director_approved_at := coalesce(NEW.cancellation_director_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_director_approved_by := coalesce(NEW.cancellation_director_approved_by, NEW.cancellation_final_approved_by);
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_enforce_leave_request_state_consistency ON public.leave_requests;

CREATE TRIGGER zzz_enforce_leave_request_state_consistency
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_state_consistency();

-- Normalize existing rows through the new trigger chain (snapshot -> normalize -> enforce).
UPDATE public.leave_requests
SET approval_route_snapshot = approval_route_snapshot,
    cancellation_route_snapshot = cancellation_route_snapshot,
    document_url = document_url,
    manager_comments = manager_comments,
    amendment_notes = amendment_notes,
    rejection_reason = rejection_reason,
    cancellation_reason = cancellation_reason,
    cancellation_comments = cancellation_comments,
    cancellation_rejection_reason = cancellation_rejection_reason
WHERE approval_route_snapshot IS NOT NULL
   OR cancellation_route_snapshot IS NOT NULL
   OR document_url IS NOT NULL
   OR manager_comments IS NOT NULL
   OR amendment_notes IS NOT NULL
   OR rejection_reason IS NOT NULL
   OR cancellation_reason IS NOT NULL
   OR cancellation_comments IS NOT NULL
   OR cancellation_rejection_reason IS NOT NULL
   OR (
        status = 'cancelled'
        AND final_approved_at IS NOT NULL
        AND cancellation_status IS NULL
        AND cancelled_at IS NOT NULL
        AND cancelled_by IS NOT NULL
        AND cancelled_by_role IS NOT NULL
      );

DROP TRIGGER IF EXISTS zzy_normalize_leave_request_state ON public.leave_requests;

CREATE TRIGGER zzy_normalize_leave_request_state
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leave_request_state();

CREATE OR REPLACE FUNCTION public.enforce_leave_request_state_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  approval_route text[] := coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]);
  cancellation_route text[] := coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]);
  approval_route_len int := coalesce(array_length(approval_route, 1), 0);
  cancellation_route_len int := coalesce(array_length(cancellation_route, 1), 0);
  approval_final_stage text := NULL;
  cancellation_final_stage text := NULL;
  approval_status_stage text := NULL;
  cancellation_status_stage text := NULL;
  final_triplet_count int := 0;
  cancelled_triplet_count int := 0;
  cancellation_final_triplet_count int := 0;
  cancellation_reject_pair_count int := 0;
  cancellation_request_core_count int := 0;
  has_manager_approval boolean := false;
  has_gm_approval boolean := false;
  has_director_approval boolean := false;
  manager_approval_complete boolean := false;
  gm_approval_complete boolean := false;
  director_approval_complete boolean := false;
  has_cancellation_manager_approval boolean := false;
  has_cancellation_gm_approval boolean := false;
  has_cancellation_director_approval boolean := false;
  cancellation_manager_approval_complete boolean := false;
  cancellation_gm_approval_complete boolean := false;
  cancellation_director_approval_complete boolean := false;
BEGIN
  approval_final_stage := CASE WHEN approval_route_len > 0 THEN approval_route[approval_route_len] ELSE NULL END;
  cancellation_final_stage := CASE WHEN cancellation_route_len > 0 THEN cancellation_route[cancellation_route_len] ELSE NULL END;

  approval_status_stage := CASE NEW.status
    WHEN 'manager_approved' THEN 'manager'
    WHEN 'gm_approved' THEN 'general_manager'
    WHEN 'director_approved' THEN 'director'
    ELSE NULL
  END;

  cancellation_status_stage := CASE NEW.cancellation_status
    WHEN 'manager_approved' THEN 'manager'
    WHEN 'gm_approved' THEN 'general_manager'
    WHEN 'director_approved' THEN 'director'
    ELSE NULL
  END;

  has_manager_approval := NEW.manager_approved_at IS NOT NULL OR NEW.manager_approved_by IS NOT NULL;
  has_gm_approval := NEW.gm_approved_at IS NOT NULL OR NEW.gm_approved_by IS NOT NULL;
  has_director_approval := NEW.director_approved_at IS NOT NULL OR NEW.director_approved_by IS NOT NULL;
  manager_approval_complete := NEW.manager_approved_at IS NOT NULL AND NEW.manager_approved_by IS NOT NULL;
  gm_approval_complete := NEW.gm_approved_at IS NOT NULL AND NEW.gm_approved_by IS NOT NULL;
  director_approval_complete := NEW.director_approved_at IS NOT NULL AND NEW.director_approved_by IS NOT NULL;

  has_cancellation_manager_approval := NEW.cancellation_manager_approved_at IS NOT NULL OR NEW.cancellation_manager_approved_by IS NOT NULL;
  has_cancellation_gm_approval := NEW.cancellation_gm_approved_at IS NOT NULL OR NEW.cancellation_gm_approved_by IS NOT NULL;
  has_cancellation_director_approval := NEW.cancellation_director_approved_at IS NOT NULL OR NEW.cancellation_director_approved_by IS NOT NULL;
  cancellation_manager_approval_complete := NEW.cancellation_manager_approved_at IS NOT NULL AND NEW.cancellation_manager_approved_by IS NOT NULL;
  cancellation_gm_approval_complete := NEW.cancellation_gm_approved_at IS NOT NULL AND NEW.cancellation_gm_approved_by IS NOT NULL;
  cancellation_director_approval_complete := NEW.cancellation_director_approved_at IS NOT NULL AND NEW.cancellation_director_approved_by IS NOT NULL;

  -- Approval/cancellation stage stamp pairs must be complete when present.
  IF has_manager_approval AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: manager approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_gm_approval AND NOT gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: GM approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND NOT director_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  IF has_cancellation_manager_approval AND NOT cancellation_manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation manager approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_cancellation_gm_approval AND NOT cancellation_gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_cancellation_director_approval AND NOT cancellation_director_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Core approval finalization metadata must be all-or-none.
  final_triplet_count :=
    (CASE WHEN NEW.final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.final_approved_by_role IS NOT NULL
     AND NEW.final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  -- Cancellation completion metadata must be all-or-none.
  cancelled_triplet_count :=
    (CASE WHEN NEW.cancelled_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancelled_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancelled_by_role IS NOT NULL
     AND NEW.cancelled_by_role::text NOT IN ('employee', 'manager', 'general_manager', 'director', 'hr', 'admin')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled_by_role must be a valid application role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_final_triplet_count :=
    (CASE WHEN NEW.cancellation_final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancellation_final_approved_by_role IS NOT NULL
     AND NEW.cancellation_final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation_final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_reject_pair_count :=
    (CASE WHEN NEW.cancellation_rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_rejected_by IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_reject_pair_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  IF ((CASE WHEN NEW.rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.rejected_by IS NOT NULL THEN 1 ELSE 0 END)) NOT IN (0, 2)
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: leave rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Route-aware stage stamp consistency for base approval workflow.
  IF approval_route_len > 0 THEN
    IF NOT ('manager' = ANY(approval_route)) AND has_manager_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager approval stamps present for a route that excludes manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('general_manager' = ANY(approval_route)) AND has_gm_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: GM approval stamps present for a route that excludes general manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('director' = ANY(approval_route)) AND has_director_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: director approval stamps present for a route that excludes director'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF has_gm_approval AND ('manager' = ANY(approval_route)) AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: GM approval requires manager approval stamps when manager is in the route'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND ('manager' = ANY(approval_route)) AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval requires manager approval stamps when manager is in the route'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND ('general_manager' = ANY(approval_route)) AND NOT gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval requires GM approval stamps when general manager is in the route'
      USING ERRCODE = '22023';
  END IF;

  IF approval_status_stage IS NOT NULL THEN
    IF approval_route_len = 0 OR NOT (approval_status_stage = ANY(approval_route)) THEN
      RAISE EXCEPTION 'leave_requests state invariant: approval status % is incompatible with approval_route_snapshot', NEW.status
        USING ERRCODE = '22023';
    END IF;

    IF final_triplet_count = 3 THEN
      IF approval_status_stage <> approval_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final approval metadata may only be set when status matches the route final stage'
          USING ERRCODE = '22023';
      END IF;
      IF NEW.final_approved_by_role::text <> approval_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final_approved_by_role must match the route final stage role'
          USING ERRCODE = '22023';
      END IF;
    ELSIF approval_status_stage = approval_final_stage THEN
      RAISE EXCEPTION 'leave_requests state invariant: status at route final stage requires final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Final-approved rows should never be pending or rejected.
  IF NEW.final_approved_at IS NOT NULL AND NEW.status IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'leave_requests state invariant: final-approved leave cannot have pending/rejected status'
      USING ERRCODE = '22023';
  END IF;

  -- Status-specific core requirements + route-aware future stamp prevention.
  IF NEW.status = 'pending' THEN
    IF has_manager_approval
       OR has_gm_approval
       OR has_director_approval
       OR NEW.hr_approved_at IS NOT NULL
       OR NEW.hr_approved_by IS NOT NULL
       OR NEW.rejected_at IS NOT NULL
       OR NEW.rejected_by IS NOT NULL
       OR NEW.cancelled_at IS NOT NULL
       OR NEW.cancelled_by IS NOT NULL
       OR NEW.final_approved_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: pending leave cannot carry approval/rejection/cancellation stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'manager_approved' THEN
    IF NOT manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status requires manager approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF has_gm_approval OR has_director_approval OR NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status cannot contain later-stage approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'gm_approved' THEN
    IF NOT gm_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status requires GM approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF has_director_approval OR NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status cannot contain later-stage approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'director_approved' THEN
    IF NOT director_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status requires director approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status cannot contain hr_approved stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'hr_approved' THEN
    IF NEW.hr_approved_at IS NULL OR NEW.hr_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status requires HR approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.rejected_at IS NULL OR NEW.rejected_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected status requires rejection stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have final approval metadata'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.cancellation_status IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_at IS NULL OR NEW.cancelled_by IS NULL OR NEW.cancelled_by_role IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancelled status requires cancelled_at/cancelled_by/cancelled_by_role'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.status <> 'cancelled' AND cancelled_triplet_count <> 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata may only be present when status is cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF (
    NEW.status <> 'pending'
    OR NEW.final_approved_at IS NOT NULL
    OR NEW.cancellation_status IS NOT NULL
  ) AND approval_route_len = 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot is required for non-pending or final/cancellation states'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.final_approved_at IS NULL AND (
    NEW.cancellation_status IS NOT NULL
    OR NEW.cancellation_route_snapshot IS NOT NULL
    OR NEW.cancellation_requested_at IS NOT NULL
    OR NEW.cancellation_requested_by IS NOT NULL
    OR NEW.cancellation_reason IS NOT NULL
    OR NEW.cancellation_comments IS NOT NULL
    OR has_cancellation_manager_approval
    OR has_cancellation_gm_approval
    OR has_cancellation_director_approval
    OR NEW.cancellation_final_approved_at IS NOT NULL
    OR NEW.cancellation_final_approved_by IS NOT NULL
    OR NEW.cancellation_final_approved_by_role IS NOT NULL
    OR NEW.cancellation_rejected_at IS NOT NULL
    OR NEW.cancellation_rejected_by IS NOT NULL
    OR NEW.cancellation_rejection_reason IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation workflow data requires a final-approved leave request'
      USING ERRCODE = '22023';
  END IF;

  cancellation_request_core_count :=
    (CASE WHEN NEW.cancellation_requested_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_requested_by IS NOT NULL THEN 1 ELSE 0 END);

  IF NEW.cancellation_status IS NULL THEN
    IF NEW.cancellation_route_snapshot IS NOT NULL
       OR NEW.cancellation_requested_at IS NOT NULL
       OR NEW.cancellation_requested_by IS NOT NULL
       OR NEW.cancellation_reason IS NOT NULL
       OR NEW.cancellation_comments IS NOT NULL
       OR has_cancellation_manager_approval
       OR has_cancellation_gm_approval
       OR has_cancellation_director_approval
       OR NEW.cancellation_final_approved_at IS NOT NULL
       OR NEW.cancellation_final_approved_by IS NOT NULL
       OR NEW.cancellation_final_approved_by_role IS NOT NULL
       OR NEW.cancellation_rejected_at IS NOT NULL
       OR NEW.cancellation_rejected_by IS NOT NULL
       OR NEW.cancellation_rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation fields must be cleared when cancellation_status is NULL'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    IF cancellation_route_len = 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation_route_snapshot is required when cancellation_status is set'
        USING ERRCODE = '22023';
    END IF;

    IF cancellation_request_core_count <> 2 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation request metadata must include requester and timestamp'
        USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'rejected' THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot carry cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;

    -- Route-aware stage stamp consistency for cancellation workflow.
    IF NOT ('manager' = ANY(cancellation_route)) AND has_cancellation_manager_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation manager approval stamps present for a route that excludes manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('general_manager' = ANY(cancellation_route)) AND has_cancellation_gm_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval stamps present for a route that excludes general manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('director' = ANY(cancellation_route)) AND has_cancellation_director_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval stamps present for a route that excludes director'
        USING ERRCODE = '22023';
    END IF;

    IF has_cancellation_gm_approval AND ('manager' = ANY(cancellation_route)) AND NOT cancellation_manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval requires manager approval stamps when manager is in the route'
        USING ERRCODE = '22023';
    END IF;
    IF has_cancellation_director_approval AND ('manager' = ANY(cancellation_route)) AND NOT cancellation_manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval requires manager approval stamps when manager is in the route'
        USING ERRCODE = '22023';
    END IF;
    IF has_cancellation_director_approval AND ('general_manager' = ANY(cancellation_route)) AND NOT cancellation_gm_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval requires GM approval stamps when general manager is in the route'
        USING ERRCODE = '22023';
    END IF;

    IF cancellation_status_stage IS NOT NULL THEN
      IF NOT (cancellation_status_stage = ANY(cancellation_route)) THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation status % is incompatible with cancellation_route_snapshot', NEW.cancellation_status
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_status_stage = cancellation_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final cancellation stage must be represented by cancellation_status=approved'
          USING ERRCODE = '22023';
      END IF;
    END IF;

    IF NEW.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot exist on cancelled leave'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'pending' THEN
        IF has_cancellation_manager_approval OR has_cancellation_gm_approval OR has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation_status=pending cannot contain approver-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'manager_approved' THEN
        IF NOT cancellation_manager_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status requires manager approval stamps'
            USING ERRCODE = '22023';
        END IF;
        IF has_cancellation_gm_approval OR has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status cannot contain later-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'gm_approved' THEN
        IF NOT cancellation_gm_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status requires GM approval stamps'
            USING ERRCODE = '22023';
        END IF;
        IF has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status cannot contain later-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'director_approved' THEN
        IF NOT cancellation_director_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: director_approved cancellation status requires director approval stamps'
            USING ERRCODE = '22023';
        END IF;
      END IF;

      IF cancellation_final_triplet_count <> 0
         OR cancellation_reject_pair_count <> 0
         OR NEW.cancellation_rejection_reason IS NOT NULL
         OR cancelled_triplet_count <> 0
      THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot contain final/rejected/cancelled stamps'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'approved' THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation_status=approved requires status=cancelled'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires final cancellation approval metadata'
          USING ERRCODE = '22023';
      END IF;
      IF cancelled_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires cancelled metadata'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_stage IS NULL THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires a cancellation route'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancelled_by_role::text <> NEW.cancellation_final_approved_by_role::text THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancelled_by_role must match cancellation_final_approved_by_role for approved cancellations'
          USING ERRCODE = '22023';
      END IF;

      -- Legacy rows may have HR as the historical cancellation final approver. Preserve them, but
      -- enforce strict route-aware matching for all current canonical approver roles.
      IF NEW.cancellation_final_approved_by_role::text <> 'hr' THEN
        IF NEW.cancellation_final_approved_by_role::text <> cancellation_final_stage THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation_final_approved_by_role must match the route final stage role'
            USING ERRCODE = '22023';
        END IF;

        IF cancellation_final_stage = 'manager' AND NOT cancellation_manager_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires manager approval stamps for manager-final route'
            USING ERRCODE = '22023';
        END IF;
        IF cancellation_final_stage = 'general_manager' AND NOT cancellation_gm_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires GM approval stamps for GM-final route'
            USING ERRCODE = '22023';
        END IF;
        IF cancellation_final_stage = 'director' AND NOT cancellation_director_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires director approval stamps for director-final route'
            USING ERRCODE = '22023';
        END IF;
      END IF;

      IF cancellation_reject_pair_count <> 0 OR NEW.cancellation_rejection_reason IS NOT NULL THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state cannot contain rejection metadata'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'rejected' THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot have cancelled leave status'
          USING ERRCODE = '22023';
      END IF;
      IF cancellation_reject_pair_count <> 2 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state requires rejection metadata'
          USING ERRCODE = '22023';
      END IF;
      IF cancellation_final_triplet_count <> 0 OR cancelled_triplet_count <> 0 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot contain final cancellation/cancelled metadata'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- Phase 4C: deeper amendment/resubmit sequencing invariants + leave workflow event log groundwork

CREATE OR REPLACE FUNCTION public.normalize_leave_request_resubmission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  is_amendment_update boolean := false;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Treat any pending-row amendment timestamp change as a resubmission/amendment cycle.
  is_amendment_update := (
    NEW.status = 'pending'
    AND NEW.amended_at IS NOT NULL
    AND (
      NEW.amended_at IS DISTINCT FROM OLD.amended_at
      OR NEW.amendment_notes IS DISTINCT FROM OLD.amendment_notes
      OR NEW.reason IS DISTINCT FROM OLD.reason
      OR NEW.document_url IS DISTINCT FROM OLD.document_url
    )
  );

  IF NOT is_amendment_update THEN
    RETURN NEW;
  END IF;

  -- Resubmissions restart the approval lifecycle. Clear stale approval/rejection/final/cancellation state.
  NEW.manager_approved_at := NULL;
  NEW.manager_approved_by := NULL;
  NEW.gm_approved_at := NULL;
  NEW.gm_approved_by := NULL;
  NEW.director_approved_at := NULL;
  NEW.director_approved_by := NULL;
  NEW.hr_approved_at := NULL;
  NEW.hr_approved_by := NULL;
  NEW.hr_notified_at := NULL;
  NEW.rejected_at := NULL;
  NEW.rejected_by := NULL;
  NEW.rejection_reason := NULL;
  NEW.final_approved_at := NULL;
  NEW.final_approved_by := NULL;
  NEW.final_approved_by_role := NULL;

  NEW.cancellation_status := NULL;
  NEW.cancellation_route_snapshot := NULL;
  NEW.cancellation_requested_at := NULL;
  NEW.cancellation_requested_by := NULL;
  NEW.cancellation_reason := NULL;
  NEW.cancellation_comments := NULL;
  NEW.cancellation_manager_approved_at := NULL;
  NEW.cancellation_manager_approved_by := NULL;
  NEW.cancellation_gm_approved_at := NULL;
  NEW.cancellation_gm_approved_by := NULL;
  NEW.cancellation_director_approved_at := NULL;
  NEW.cancellation_director_approved_by := NULL;
  NEW.cancellation_final_approved_at := NULL;
  NEW.cancellation_final_approved_by := NULL;
  NEW.cancellation_final_approved_by_role := NULL;
  NEW.cancellation_rejected_at := NULL;
  NEW.cancellation_rejected_by := NULL;
  NEW.cancellation_rejection_reason := NULL;
  NEW.cancelled_at := NULL;
  NEW.cancelled_by := NULL;
  NEW.cancelled_by_role := NULL;

  -- If the amendment included a document upload, clear the manager document request flag.
  IF NEW.document_url IS NOT NULL THEN
    NEW.document_required := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzx_normalize_leave_request_resubmission ON public.leave_requests;

CREATE TRIGGER zzx_normalize_leave_request_resubmission
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leave_request_resubmission();

CREATE OR REPLACE FUNCTION public.enforce_leave_request_transition_sequencing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  old_status_rank int := NULL;
  new_status_rank int := NULL;
  old_cancel_rank int := NULL;
  new_cancel_rank int := NULL;
  has_amendment_note boolean := coalesce(NULLIF(btrim(coalesce(NEW.amendment_notes, '')), ''), NULL) IS NOT NULL;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Amendment metadata should be coherent and monotonic.
  IF NEW.amended_at IS NULL AND has_amendment_note THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amendment_notes requires amended_at'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.amended_at IS NOT NULL AND NOT has_amendment_note THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at requires non-empty amendment_notes'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.amended_at IS NOT NULL AND NEW.created_at IS NOT NULL AND NEW.amended_at < NEW.created_at THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at cannot be earlier than created_at'
      USING ERRCODE = '22023';
  END IF;

  IF OLD.amended_at IS NOT NULL AND NEW.amended_at IS NOT NULL AND NEW.amended_at < OLD.amended_at THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at must be monotonic'
      USING ERRCODE = '22023';
  END IF;

  -- Cancelled requests are terminal in the current model.
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'leave_requests transition invariant: cancelled requests cannot be reopened'
      USING ERRCODE = '22023';
  END IF;

  -- Approved requests must use the cancellation workflow; they cannot be directly resubmitted to pending.
  IF OLD.final_approved_at IS NOT NULL
     AND OLD.status <> 'cancelled'
     AND NEW.status = 'pending'
  THEN
    RAISE EXCEPTION 'leave_requests transition invariant: final-approved leave cannot be resubmitted to pending; use cancellation workflow'
      USING ERRCODE = '22023';
  END IF;

  -- Rejected -> pending is the supported resubmit path and must carry fresh amendment metadata.
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    IF NEW.amended_at IS NULL OR NOT has_amendment_note THEN
      RAISE EXCEPTION 'leave_requests transition invariant: rejected leave resubmission requires amended_at and amendment_notes'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.amended_at IS NOT DISTINCT FROM OLD.amended_at
       AND NEW.amendment_notes IS NOT DISTINCT FROM OLD.amendment_notes
       AND NEW.reason IS NOT DISTINCT FROM OLD.reason
       AND NEW.document_url IS NOT DISTINCT FROM OLD.document_url
    THEN
      RAISE EXCEPTION 'leave_requests transition invariant: rejected leave resubmission must change amendment metadata, reason, or document'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Guard against arbitrary rollback between approval stages.
  old_status_rank := CASE OLD.status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'hr_approved' THEN 4
    ELSE NULL
  END;
  new_status_rank := CASE NEW.status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'hr_approved' THEN 4
    ELSE NULL
  END;

  IF old_status_rank IS NOT NULL AND new_status_rank IS NOT NULL AND new_status_rank < old_status_rank THEN
    -- The only supported backward move to pending is rejected -> pending resubmission, which is handled above.
    RAISE EXCEPTION 'leave_requests transition invariant: approval stage rollback is not allowed (% -> %)', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  -- Cancellation workflow re-requests may go rejected -> pending, but active-stage rollback is not allowed.
  old_cancel_rank := CASE OLD.cancellation_status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'approved' THEN 4
    ELSE NULL
  END;
  new_cancel_rank := CASE NEW.cancellation_status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'approved' THEN 4
    ELSE NULL
  END;

  IF old_cancel_rank IS NOT NULL AND new_cancel_rank IS NOT NULL AND new_cancel_rank < old_cancel_rank THEN
    RAISE EXCEPTION 'leave_requests transition invariant: cancellation workflow stage rollback is not allowed (% -> %)', OLD.cancellation_status, NEW.cancellation_status
      USING ERRCODE = '22023';
  END IF;

  IF OLD.cancellation_status = 'rejected' AND NEW.cancellation_status = 'pending' THEN
    IF NEW.cancellation_requested_at IS NULL OR NEW.cancellation_requested_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests transition invariant: cancellation re-request requires requester and timestamp'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.cancellation_requested_at IS NOT DISTINCT FROM OLD.cancellation_requested_at
       AND NEW.cancellation_reason IS NOT DISTINCT FROM OLD.cancellation_reason
    THEN
      RAISE EXCEPTION 'leave_requests transition invariant: cancellation re-request must refresh request metadata'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz0_enforce_leave_request_transition_sequencing ON public.leave_requests;

CREATE TRIGGER zzz0_enforce_leave_request_transition_sequencing
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_transition_sequencing();

CREATE TABLE IF NOT EXISTS public.leave_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.app_role NULL,
  from_status text NULL,
  to_status text NULL,
  from_cancellation_status text NULL,
  to_cancellation_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_request_events_leave_request_id_occurred_at
  ON public.leave_request_events (leave_request_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_request_events_event_type
  ON public.leave_request_events (event_type);

ALTER TABLE public.leave_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_request_events_select_authenticated ON public.leave_request_events;
CREATE POLICY leave_request_events_select_authenticated
ON public.leave_request_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_events.leave_request_id
      AND (
        lr.employee_id = public.request_user_id()
        OR public.has_role(public.request_user_id(), 'hr')
        OR public.has_role(public.request_user_id(), 'admin')
        OR public.has_role(public.request_user_id(), 'director')
        OR (
          public.has_role(public.request_user_id(), 'manager')
          AND (
            public.is_manager_of(public.request_user_id(), lr.employee_id)
            OR public.is_department_manager(public.request_user_id(), lr.employee_id)
          )
        )
        OR (
          public.has_role(public.request_user_id(), 'general_manager')
          AND (
            public.is_manager_of(public.request_user_id(), lr.employee_id)
            OR public.is_department_manager(public.request_user_id(), lr.employee_id)
          )
        )
      )
  )
);

GRANT SELECT ON public.leave_request_events TO authenticated;
REVOKE ALL ON public.leave_request_events FROM anon;

CREATE OR REPLACE FUNCTION public.log_leave_request_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  actor_id uuid := NULL;
  actor_role_value public.app_role := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      to_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_created',
      coalesce(NEW.created_at, now()),
      NEW.employee_id,
      'employee',
      NEW.status,
      NEW.cancellation_status,
      jsonb_build_object(
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'approval_route_snapshot', coalesce(to_jsonb(NEW.approval_route_snapshot), 'null'::jsonb)
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor_id := CASE NEW.status
      WHEN 'manager_approved' THEN NEW.manager_approved_by
      WHEN 'gm_approved' THEN NEW.gm_approved_by
      WHEN 'director_approved' THEN NEW.director_approved_by
      WHEN 'hr_approved' THEN NEW.hr_approved_by
      WHEN 'rejected' THEN NEW.rejected_by
      WHEN 'cancelled' THEN coalesce(NEW.cancelled_by, NEW.cancellation_final_approved_by)
      WHEN 'pending' THEN CASE WHEN NEW.amended_at IS NOT NULL THEN NEW.employee_id ELSE NULL END
      ELSE NULL
    END;

    actor_role_value := CASE NEW.status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      WHEN 'director_approved' THEN 'director'
      WHEN 'hr_approved' THEN 'hr'
      WHEN 'cancelled' THEN coalesce(NEW.cancelled_by_role, NEW.cancellation_final_approved_by_role)
      WHEN 'pending' THEN CASE WHEN NEW.amended_at IS NOT NULL THEN 'employee'::public.app_role ELSE NULL END
      ELSE NULL
    END;

    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      from_cancellation_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'pending' AND OLD.status = 'rejected' AND NEW.amended_at IS NOT NULL THEN 'leave_resubmitted'
        ELSE 'leave_status_changed'
      END,
      coalesce(NEW.updated_at, now()),
      actor_id,
      actor_role_value,
      OLD.status,
      NEW.status,
      OLD.cancellation_status,
      NEW.cancellation_status,
      jsonb_build_object(
        'approval_route_snapshot', coalesce(to_jsonb(NEW.approval_route_snapshot), 'null'::jsonb)
      )
    );
  END IF;

  IF NEW.rejected_at IS NOT NULL AND (OLD.rejected_at IS NULL OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_rejected',
      NEW.rejected_at,
      NEW.rejected_by,
      OLD.status,
      NEW.status,
      jsonb_build_object('rejection_reason', NEW.rejection_reason)
    );
  END IF;

  IF NEW.final_approved_at IS NOT NULL AND (OLD.final_approved_at IS NULL OR NEW.final_approved_at IS DISTINCT FROM OLD.final_approved_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_final_approved',
      NEW.final_approved_at,
      NEW.final_approved_by,
      NEW.final_approved_by_role,
      OLD.status,
      NEW.status,
      jsonb_build_object('final_approved_by_role', NEW.final_approved_by_role)
    );
  END IF;

  IF NEW.amended_at IS NOT NULL AND (OLD.amended_at IS NULL OR NEW.amended_at IS DISTINCT FROM OLD.amended_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_amended',
      NEW.amended_at,
      NEW.employee_id,
      'employee',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'amendment_notes', NEW.amendment_notes,
        'document_attached', NEW.document_url IS NOT NULL
      )
    );
  END IF;

  IF coalesce(OLD.document_required, false) = false AND coalesce(NEW.document_required, false) = true THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_document_requested',
      coalesce(NEW.updated_at, now()),
      NULL,
      OLD.status,
      NEW.status,
      jsonb_build_object('manager_comments', NEW.manager_comments)
    );
  END IF;

  IF NEW.document_url IS NOT NULL AND (OLD.document_url IS NULL OR NEW.document_url IS DISTINCT FROM OLD.document_url) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_document_attached',
      coalesce(NEW.updated_at, now()),
      NEW.employee_id,
      'employee',
      OLD.status,
      NEW.status,
      jsonb_build_object('document_required', NEW.document_required)
    );
  END IF;

  IF NEW.cancellation_status IS DISTINCT FROM OLD.cancellation_status THEN
    actor_id := CASE NEW.cancellation_status
      WHEN 'pending' THEN NEW.cancellation_requested_by
      WHEN 'manager_approved' THEN NEW.cancellation_manager_approved_by
      WHEN 'gm_approved' THEN NEW.cancellation_gm_approved_by
      WHEN 'director_approved' THEN NEW.cancellation_director_approved_by
      WHEN 'approved' THEN NEW.cancellation_final_approved_by
      WHEN 'rejected' THEN NEW.cancellation_rejected_by
      ELSE NULL
    END;

    actor_role_value := CASE NEW.cancellation_status
      WHEN 'pending' THEN 'employee'
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      WHEN 'director_approved' THEN 'director'
      WHEN 'approved' THEN NEW.cancellation_final_approved_by_role
      ELSE NULL
    END;

    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      from_cancellation_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.cancellation_status = 'pending' THEN
          CASE WHEN OLD.cancellation_status = 'rejected' THEN 'leave_cancellation_re_requested' ELSE 'leave_cancellation_requested' END
        WHEN NEW.cancellation_status = 'approved' THEN 'leave_cancellation_approved'
        WHEN NEW.cancellation_status = 'rejected' THEN 'leave_cancellation_rejected'
        WHEN NEW.cancellation_status IN ('manager_approved', 'gm_approved', 'director_approved') THEN 'leave_cancellation_stage_approved'
        ELSE 'leave_cancellation_status_changed'
      END,
      coalesce(
        CASE
          WHEN NEW.cancellation_status = 'pending' THEN NEW.cancellation_requested_at
          WHEN NEW.cancellation_status = 'approved' THEN NEW.cancellation_final_approved_at
          WHEN NEW.cancellation_status = 'rejected' THEN NEW.cancellation_rejected_at
          WHEN NEW.cancellation_status = 'manager_approved' THEN NEW.cancellation_manager_approved_at
          WHEN NEW.cancellation_status = 'gm_approved' THEN NEW.cancellation_gm_approved_at
          WHEN NEW.cancellation_status = 'director_approved' THEN NEW.cancellation_director_approved_at
          ELSE NULL
        END,
        coalesce(NEW.updated_at, now())
      ),
      actor_id,
      actor_role_value,
      OLD.status,
      NEW.status,
      OLD.cancellation_status,
      NEW.cancellation_status,
      jsonb_build_object(
        'cancellation_route_snapshot', coalesce(to_jsonb(NEW.cancellation_route_snapshot), 'null'::jsonb),
        'cancellation_reason', NEW.cancellation_reason,
        'cancellation_rejection_reason', NEW.cancellation_rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_log_leave_request_events ON public.leave_requests;

CREATE TRIGGER zzzz_log_leave_request_events
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_leave_request_events();

ANALYZE public.leave_request_events;


-- Phase 4D: dedicated leave amendment RPC for rejected/pending-document resubmission flows

CREATE OR REPLACE FUNCTION public.amend_leave_request(
  _request_id UUID,
  _amendment_notes TEXT,
  _reason TEXT DEFAULT NULL,
  _document_url TEXT DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  amended_row public.leave_requests%ROWTYPE;
  trimmed_notes TEXT := NULLIF(pg_catalog.btrim(COALESCE(_amendment_notes, '')), '');
  trimmed_reason TEXT := CASE
    WHEN _reason IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_reason), '')
  END;
  trimmed_document_url TEXT := CASE
    WHEN _document_url IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_document_url), '')
  END;
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  IF trimmed_notes IS NULL THEN
    RAISE EXCEPTION 'Amendment notes are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only amend your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled leave requests cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Final-approved leave requests cannot be amended; use cancellation workflow'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.cancellation_status IS NOT NULL THEN
    RAISE EXCEPTION 'Leave requests with cancellation workflow state cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    request_row.status = 'rejected'
    OR (request_row.status = 'pending' AND coalesce(request_row.document_required, false) = true)
  ) THEN
    RAISE EXCEPTION 'Only rejected requests or pending requests with requested documents can be amended'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.leave_requests
  SET status = 'pending',
      amendment_notes = trimmed_notes,
      amended_at = now(),
      reason = COALESCE(trimmed_reason, public.leave_requests.reason),
      document_url = CASE
        WHEN _document_url IS NULL THEN public.leave_requests.document_url
        ELSE trimmed_document_url
      END
  WHERE id = _request_id
  RETURNING * INTO amended_row;

  RETURN amended_row;
END;
$$;

REVOKE ALL ON FUNCTION public.amend_leave_request(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.amend_leave_request(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id uuid,
  leave_request_id uuid REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  leave_request_event_id uuid REFERENCES public.leave_request_events(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_event_unique
  ON public.user_notifications (user_id, leave_request_event_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read_created
  ON public.user_notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_leave_request
  ON public.user_notifications (leave_request_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
CREATE POLICY user_notifications_select_own
ON public.user_notifications
FOR SELECT
TO authenticated
USING (user_id = public.request_user_id());

REVOKE ALL ON public.user_notifications FROM anon;
GRANT SELECT ON public.user_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_user_notifications_read(_notification_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.user_notifications n
  SET read_at = coalesce(n.read_at, now())
  WHERE n.user_id = v_user_id
    AND n.read_at IS NULL
    AND (
      _notification_ids IS NULL
      OR n.id = ANY (_notification_ids)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_user_notifications_read(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_read(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.next_leave_stage_from_route(
  _route text[],
  _current_stage text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_canonical constant text[] := ARRAY['manager', 'general_manager', 'director'];
  v_stage text;
  v_seen_current boolean := (_current_stage IS NULL);
BEGIN
  IF _route IS NULL OR coalesce(array_length(_route, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;

  FOREACH v_stage IN ARRAY v_canonical LOOP
    IF NOT (v_stage = ANY (_route)) THEN
      CONTINUE;
    END IF;

    IF v_seen_current THEN
      RETURN v_stage;
    END IF;

    IF v_stage = _current_stage THEN
      v_seen_current := true;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_stage_recipients(
  _employee_id uuid,
  _stage text
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
  WITH emp AS (
    SELECT
      p.id,
      p.manager_id,
      mgr.manager_id AS gm_manager_id
    FROM public.profiles p
    LEFT JOIN public.profiles mgr ON mgr.id = p.manager_id
    WHERE p.id = _employee_id
  )
  SELECT DISTINCT recipient.user_id
  FROM (
    SELECT emp.manager_id AS user_id
    FROM emp
    WHERE _stage = 'manager'

    UNION ALL

    SELECT emp.gm_manager_id AS user_id
    FROM emp
    WHERE _stage = 'general_manager'

    UNION ALL

    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE _stage = 'director'
      AND ur.role = 'director'::public.app_role
  ) AS recipient
  WHERE recipient.user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.create_leave_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_employee_id uuid;
  v_requester_name text;
  v_leave_type_name text;
  v_start_date date;
  v_end_date date;
  v_approval_route text[];
  v_cancellation_route text[];
  v_next_stage text;
  v_next_stage_label text;
  v_current_approval_stage text;
  v_current_cancellation_stage text;
  v_date_span text;
  v_requester_title text;
  v_requester_message text;
  v_monitor_title text;
  v_monitor_message text;
BEGIN
  SELECT
    lr.employee_id,
    concat_ws(' ', p.first_name, p.last_name),
    lt.name,
    lr.start_date,
    lr.end_date,
    lr.approval_route_snapshot::text[],
    lr.cancellation_route_snapshot::text[]
  INTO
    v_employee_id,
    v_requester_name,
    v_leave_type_name,
    v_start_date,
    v_end_date,
    v_approval_route,
    v_cancellation_route
  FROM public.leave_requests lr
  JOIN public.profiles p ON p.id = lr.employee_id
  LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.id = NEW.leave_request_id;

  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_date_span := to_char(v_start_date, 'Mon DD, YYYY') || ' to ' || to_char(v_end_date, 'Mon DD, YYYY');

  -- Determine the next required approver stage (if any) for queue notifications.
  v_next_stage := NULL;

  IF NEW.event_type IN ('leave_created', 'leave_resubmitted', 'leave_document_attached') THEN
    v_next_stage := public.next_leave_stage_from_route(v_approval_route, NULL);
  ELSIF NEW.event_type = 'leave_status_changed' AND NEW.to_status IN ('manager_approved', 'gm_approved') THEN
    v_current_approval_stage := CASE NEW.to_status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      ELSE NULL
    END;
    v_next_stage := public.next_leave_stage_from_route(v_approval_route, v_current_approval_stage);
  ELSIF NEW.event_type IN ('leave_cancellation_requested', 'leave_cancellation_re_requested') THEN
    v_next_stage := public.next_leave_stage_from_route(v_cancellation_route, NULL);
  ELSIF NEW.event_type = 'leave_cancellation_stage_approved'
    AND NEW.to_cancellation_status IN ('manager_approved', 'gm_approved')
  THEN
    v_current_cancellation_stage := CASE NEW.to_cancellation_status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      ELSE NULL
    END;
    v_next_stage := public.next_leave_stage_from_route(v_cancellation_route, v_current_cancellation_stage);
  END IF;

  v_next_stage_label := CASE v_next_stage
    WHEN 'manager' THEN 'Manager'
    WHEN 'general_manager' THEN 'General Manager'
    WHEN 'director' THEN 'Director'
    ELSE NULL
  END;

  -- Notify the next approver in the route.
  IF v_next_stage IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      category,
      event_type,
      title,
      message,
      metadata,
      source_table,
      source_id,
      leave_request_id,
      leave_request_event_id
    )
    SELECT DISTINCT
      r.user_id,
      'leave',
      NEW.event_type,
      CASE
        WHEN NEW.event_type LIKE 'leave_cancellation%' THEN 'Leave cancellation approval required'
        ELSE 'Leave approval required'
      END,
      CASE
        WHEN NEW.event_type LIKE 'leave_cancellation%' THEN
          format(
            '%s requested cancellation for %s leave (%s). Your %s approval is required.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(v_next_stage_label, 'workflow')
          )
        ELSE
          format(
            '%s has a %s leave request (%s) awaiting %s approval.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(v_next_stage_label, 'workflow')
          )
      END,
      jsonb_build_object(
        'next_stage', v_next_stage,
        'next_stage_label', v_next_stage_label,
        'event_type', NEW.event_type,
        'occurred_at', NEW.occurred_at
      ),
      'leave_request_events',
      NEW.id,
      NEW.leave_request_id,
      NEW.id
    FROM public.leave_stage_recipients(v_employee_id, v_next_stage) r
    WHERE r.user_id IS DISTINCT FROM NEW.actor_user_id
    ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
  END IF;

  -- Requester notifications for approver-driven outcomes/progress.
  IF NEW.event_type IN (
    'leave_status_changed',
    'leave_document_requested',
    'leave_rejected',
    'leave_final_approved',
    'leave_cancellation_stage_approved',
    'leave_cancellation_approved',
    'leave_cancellation_rejected'
  ) THEN
    IF NEW.event_type = 'leave_status_changed' AND NEW.to_status NOT IN ('manager_approved', 'gm_approved') THEN
      -- Skip noisy generic status changes; terminal/final statuses are covered by dedicated events.
      NULL;
    ELSE
      v_requester_title := CASE
        WHEN NEW.event_type = 'leave_document_requested' THEN 'Supporting document requested'
        WHEN NEW.event_type = 'leave_rejected' THEN 'Leave request rejected'
        WHEN NEW.event_type = 'leave_final_approved' THEN 'Leave request approved'
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN 'Cancellation request progressed'
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN 'Cancellation request approved'
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN 'Cancellation request rejected'
        ELSE 'Leave request updated'
      END;

      v_requester_message := CASE
        WHEN NEW.event_type = 'leave_status_changed' AND NEW.to_status = 'manager_approved' THEN
          format('Your %s leave request (%s) was approved by Manager and is awaiting the next approver.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_status_changed' AND NEW.to_status = 'gm_approved' THEN
          format('Your %s leave request (%s) was approved by General Manager and is awaiting Director approval.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_document_requested' THEN
          format('A supporting document was requested for your %s leave request (%s).',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_rejected' THEN
          format('Your %s leave request (%s) was rejected.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_final_approved' THEN
          format('Your %s leave request (%s) was fully approved.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN
          format('Your cancellation request for %s leave (%s) has progressed to the next approver.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN
          format('Your cancellation request for %s leave (%s) was approved and the leave was cancelled.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN
          format('Your cancellation request for %s leave (%s) was rejected.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        ELSE
          format('Your %s leave request (%s) was updated.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
      END;

      INSERT INTO public.user_notifications (
        user_id,
        category,
        event_type,
        title,
        message,
        metadata,
        source_table,
        source_id,
        leave_request_id,
        leave_request_event_id
      )
      VALUES (
        v_employee_id,
        'leave',
        NEW.event_type,
        v_requester_title,
        v_requester_message,
        jsonb_build_object(
          'event_type', NEW.event_type,
          'from_status', NEW.from_status,
          'to_status', NEW.to_status,
          'from_cancellation_status', NEW.from_cancellation_status,
          'to_cancellation_status', NEW.to_cancellation_status
        ),
        'leave_request_events',
        NEW.id,
        NEW.leave_request_id,
        NEW.id
      )
      ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
    END IF;
  END IF;

  -- HR/Admin monitor notifications (view-only oversight).
  IF NEW.event_type IN (
    'leave_created',
    'leave_resubmitted',
    'leave_status_changed',
    'leave_document_requested',
    'leave_document_attached',
    'leave_rejected',
    'leave_final_approved',
    'leave_cancellation_requested',
    'leave_cancellation_re_requested',
    'leave_cancellation_stage_approved',
    'leave_cancellation_approved',
    'leave_cancellation_rejected'
  ) THEN
    IF NOT (NEW.event_type = 'leave_status_changed' AND NEW.to_status NOT IN ('manager_approved', 'gm_approved')) THEN
      v_monitor_title := 'Leave workflow update';
      v_monitor_message := CASE
        WHEN NEW.event_type = 'leave_created' THEN
          format('%s submitted a %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_resubmitted' THEN
          format('%s resubmitted a %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_status_changed' THEN
          format('%s''s %s leave request (%s) progressed to %s.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(NEW.to_status, 'updated')
          )
        WHEN NEW.event_type = 'leave_document_requested' THEN
          format('Supporting document requested for %s''s %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_document_attached' THEN
          format('%s attached a supporting document for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_rejected' THEN
          format('%s''s %s leave request (%s) was rejected.', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_final_approved' THEN
          format('%s''s %s leave request (%s) was fully approved.', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_requested' THEN
          format('%s requested cancellation for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_re_requested' THEN
          format('%s re-requested cancellation for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN
          format('%s''s leave cancellation request (%s) progressed to %s.',
            v_requester_name,
            v_date_span,
            coalesce(NEW.to_cancellation_status, 'the next stage')
          )
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN
          format('%s''s leave cancellation request (%s) was approved.', v_requester_name, v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN
          format('%s''s leave cancellation request (%s) was rejected.', v_requester_name, v_date_span)
        ELSE
          format('%s''s leave request (%s) was updated.', v_requester_name, v_date_span)
      END;

      INSERT INTO public.user_notifications (
        user_id,
        category,
        event_type,
        title,
        message,
        metadata,
        source_table,
        source_id,
        leave_request_id,
        leave_request_event_id
      )
      SELECT DISTINCT
        ur.user_id,
        'leave',
        NEW.event_type,
        v_monitor_title,
        v_monitor_message,
        jsonb_build_object(
          'event_type', NEW.event_type,
          'from_status', NEW.from_status,
          'to_status', NEW.to_status,
          'from_cancellation_status', NEW.from_cancellation_status,
          'to_cancellation_status', NEW.to_cancellation_status
        ),
        'leave_request_events',
        NEW.id,
        NEW.leave_request_id,
        NEW.id
      FROM public.user_roles ur
      WHERE ur.role IN ('hr'::public.app_role, 'admin'::public.app_role)
        AND ur.user_id IS DISTINCT FROM NEW.actor_user_id
      ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_create_leave_event_notifications ON public.leave_request_events;
CREATE TRIGGER zzzz_create_leave_event_notifications
AFTER INSERT ON public.leave_request_events
FOR EACH ROW
EXECUTE FUNCTION public.create_leave_event_notifications();

ANALYZE public.user_notifications;

REVOKE ALL ON FUNCTION public.mark_user_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_read(uuid[]) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.workflow_config_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type text NOT NULL CHECK (workflow_type IN ('leave_approval', 'leave_cancellation')),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  workflow_table text NOT NULL CHECK (workflow_table IN ('leave_approval_workflows', 'leave_cancellation_workflows')),
  workflow_row_id uuid NOT NULL,
  requester_role public.app_role NOT NULL,
  department_id uuid,
  changed_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_role public.app_role,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_created_at
  ON public.workflow_config_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_workflow_type_scope
  ON public.workflow_config_events (workflow_type, department_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_changed_by_user
  ON public.workflow_config_events (changed_by_user_id, created_at DESC);

ALTER TABLE public.workflow_config_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_config_events_select_privileged ON public.workflow_config_events;
CREATE POLICY workflow_config_events_select_privileged
ON public.workflow_config_events
FOR SELECT
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

REVOKE ALL ON public.workflow_config_events FROM anon;
GRANT SELECT ON public.workflow_config_events TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_source_unique
  ON public.user_notifications (user_id, source_table, source_id);

CREATE OR REPLACE FUNCTION public.log_workflow_config_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_user_id uuid := public.request_user_id();
  v_actor_role public.app_role := NULL;
  v_workflow_type text;
  v_action text;
  v_old_values jsonb := NULL;
  v_new_values jsonb := NULL;
  v_event_ts timestamptz := now();
  v_scope_department_id uuid := NULL;
  v_requester_role public.app_role;
BEGIN
  IF v_actor_user_id IS NOT NULL THEN
    SELECT ur.role
    INTO v_actor_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor_user_id
    LIMIT 1;
  END IF;

  v_workflow_type := CASE TG_TABLE_NAME
    WHEN 'leave_approval_workflows' THEN 'leave_approval'
    WHEN 'leave_cancellation_workflows' THEN 'leave_cancellation'
    ELSE NULL
  END;

  IF v_workflow_type IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_scope_department_id := NEW.department_id;
    v_requester_role := NEW.requester_role;
    v_new_values := jsonb_build_object(
      'requester_role', NEW.requester_role,
      'department_id', NEW.department_id,
      'approval_stages', coalesce(to_jsonb(NEW.approval_stages), '[]'::jsonb),
      'is_active', NEW.is_active,
      'notes', NEW.notes
    );
    v_event_ts := coalesce(NEW.updated_at, NEW.created_at, now());

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_scope_department_id := NEW.department_id;
    v_requester_role := NEW.requester_role;
    v_old_values := jsonb_build_object(
      'requester_role', OLD.requester_role,
      'department_id', OLD.department_id,
      'approval_stages', coalesce(to_jsonb(OLD.approval_stages), '[]'::jsonb),
      'is_active', OLD.is_active,
      'notes', OLD.notes
    );
    v_new_values := jsonb_build_object(
      'requester_role', NEW.requester_role,
      'department_id', NEW.department_id,
      'approval_stages', coalesce(to_jsonb(NEW.approval_stages), '[]'::jsonb),
      'is_active', NEW.is_active,
      'notes', NEW.notes
    );
    IF v_old_values IS NOT DISTINCT FROM v_new_values THEN
      RETURN NEW;
    END IF;
    v_event_ts := coalesce(NEW.updated_at, now());

  ELSE
    v_action := 'deleted';
    v_scope_department_id := OLD.department_id;
    v_requester_role := OLD.requester_role;
    v_old_values := jsonb_build_object(
      'requester_role', OLD.requester_role,
      'department_id', OLD.department_id,
      'approval_stages', coalesce(to_jsonb(OLD.approval_stages), '[]'::jsonb),
      'is_active', OLD.is_active,
      'notes', OLD.notes
    );
    v_event_ts := coalesce(OLD.updated_at, OLD.created_at, now());
  END IF;

  INSERT INTO public.workflow_config_events (
    workflow_type,
    action,
    workflow_table,
    workflow_row_id,
    requester_role,
    department_id,
    changed_by_user_id,
    changed_by_role,
    old_values,
    new_values,
    metadata,
    created_at
  )
  VALUES (
    v_workflow_type,
    v_action,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    v_requester_role,
    v_scope_department_id,
    v_actor_user_id,
    v_actor_role,
    v_old_values,
    v_new_values,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    v_event_ts
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS zzzz_log_leave_approval_workflow_events ON public.leave_approval_workflows;
CREATE TRIGGER zzzz_log_leave_approval_workflow_events
AFTER INSERT OR UPDATE OR DELETE ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.log_workflow_config_events();

DROP TRIGGER IF EXISTS zzzz_log_leave_cancellation_workflow_events ON public.leave_cancellation_workflows;
CREATE TRIGGER zzzz_log_leave_cancellation_workflow_events
AFTER INSERT OR UPDATE OR DELETE ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.log_workflow_config_events();

CREATE OR REPLACE FUNCTION public.create_workflow_config_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_department_name text;
  v_scope_label text;
  v_workflow_label text;
  v_action_label text;
  v_title text;
  v_message text;
BEGIN
  IF NEW.workflow_type NOT IN ('leave_approval', 'leave_cancellation') THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT d.name INTO v_department_name
    FROM public.departments d
    WHERE d.id = NEW.department_id;
  END IF;

  v_scope_label := coalesce(v_department_name, 'All Departments (Default)');
  v_workflow_label := CASE NEW.workflow_type
    WHEN 'leave_approval' THEN 'Leave approval workflow'
    WHEN 'leave_cancellation' THEN 'Leave cancellation workflow'
    ELSE 'Workflow'
  END;
  v_action_label := CASE NEW.action
    WHEN 'created' THEN 'created'
    WHEN 'updated' THEN 'updated'
    WHEN 'deleted' THEN 'deleted'
    ELSE 'changed'
  END;

  v_title := 'Workflow configuration updated';
  v_message := format(
    '%s (%s) was %s for %s.',
    v_workflow_label,
    coalesce(NEW.requester_role::text, 'employee'),
    v_action_label,
    v_scope_label
  );

  INSERT INTO public.user_notifications (
    user_id,
    category,
    event_type,
    title,
    message,
    metadata,
    source_table,
    source_id
  )
  SELECT DISTINCT
    ur.user_id,
    'admin',
    format('%s_workflow_%s', NEW.workflow_type, NEW.action),
    v_title,
    v_message,
    jsonb_build_object(
      'workflow_type', NEW.workflow_type,
      'action', NEW.action,
      'workflow_table', NEW.workflow_table,
      'workflow_row_id', NEW.workflow_row_id,
      'department_id', NEW.department_id,
      'requester_role', NEW.requester_role,
      'changed_by_user_id', NEW.changed_by_user_id,
      'changed_by_role', NEW.changed_by_role
    ),
    'workflow_config_events',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('hr'::public.app_role, 'admin'::public.app_role, 'director'::public.app_role)
    AND ur.user_id IS DISTINCT FROM NEW.changed_by_user_id
  ON CONFLICT (user_id, source_table, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_create_workflow_config_event_notifications ON public.workflow_config_events;
CREATE TRIGGER zzzz_create_workflow_config_event_notifications
AFTER INSERT ON public.workflow_config_events
FOR EACH ROW
EXECUTE FUNCTION public.create_workflow_config_event_notifications();

ANALYZE public.workflow_config_events;

CREATE OR REPLACE FUNCTION public.mark_user_notifications_unread(_notification_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF _notification_ids IS NULL OR coalesce(array_length(_notification_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Notification IDs are required.';
  END IF;

  UPDATE public.user_notifications n
  SET read_at = NULL
  WHERE n.user_id = v_user_id
    AND n.id = ANY (_notification_ids)
    AND n.read_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_user_notifications_unread(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_unread(uuid[]) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_enabled boolean NOT NULL DEFAULT true,
  admin_enabled boolean NOT NULL DEFAULT true,
  system_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notification_preferences_select_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_select_own
ON public.user_notification_preferences
FOR SELECT
TO authenticated
USING (user_id = public.request_user_id());

DROP POLICY IF EXISTS user_notification_preferences_insert_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_insert_own
ON public.user_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.request_user_id());

DROP POLICY IF EXISTS user_notification_preferences_update_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_update_own
ON public.user_notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = public.request_user_id())
WITH CHECK (user_id = public.request_user_id());

REVOKE ALL ON public.user_notification_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.notification_category_enabled(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE lower(coalesce(_category, 'system'))
    WHEN 'leave' THEN coalesce(p.leave_enabled, true)
    WHEN 'admin' THEN coalesce(p.admin_enabled, true)
    WHEN 'system' THEN coalesce(p.system_enabled, true)
    ELSE true
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.user_notification_preferences p
    ON p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.notification_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_category_enabled(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.suppress_muted_user_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notification_category_enabled(NEW.user_id, NEW.category) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.suppress_muted_user_notifications() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suppress_muted_user_notifications() TO service_role;

DROP TRIGGER IF EXISTS z_before_insert_user_notifications_preferences ON public.user_notifications;
CREATE TRIGGER z_before_insert_user_notifications_preferences
BEFORE INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.suppress_muted_user_notifications();

ANALYZE public.user_notification_preferences;
CREATE OR REPLACE FUNCTION public.delete_user_notifications(
  _older_than_days integer DEFAULT 90,
  _read_only boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_days integer := coalesce(_older_than_days, 90);
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF v_days < 1 OR v_days > 3650 THEN
    RAISE EXCEPTION 'Retention window must be between 1 and 3650 days.';
  END IF;

  DELETE FROM public.user_notifications n
  WHERE n.user_id = v_user_id
    AND n.created_at < now() - make_interval(days => v_days)
    AND (NOT _read_only OR n.read_at IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_notifications(integer, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_notifications(integer, boolean) TO authenticated, service_role;
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_leave_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_admin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_system_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notification_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.user_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  category text NOT NULL,
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'discarded')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  leased_by text,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_delivery_queue_notification_channel
  ON public.notification_delivery_queue (notification_id, channel);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_queue_status_next_attempt
  ON public.notification_delivery_queue (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_queue_user_created
  ON public.notification_delivery_queue (user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_notification_delivery_queue_updated_at ON public.notification_delivery_queue;
CREATE TRIGGER update_notification_delivery_queue_updated_at
BEFORE UPDATE ON public.notification_delivery_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_delivery_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_delivery_queue_service_role_all ON public.notification_delivery_queue;
CREATE POLICY notification_delivery_queue_service_role_all
ON public.notification_delivery_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.notification_delivery_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_delivery_queue TO service_role;

CREATE OR REPLACE FUNCTION public.notification_email_category_enabled(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE lower(coalesce(_category, 'system'))
    WHEN 'leave' THEN coalesce(p.email_leave_enabled, false)
    WHEN 'admin' THEN coalesce(p.email_admin_enabled, false)
    WHEN 'system' THEN coalesce(p.email_system_enabled, false)
    ELSE false
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.user_notification_preferences p
    ON p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.notification_email_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_email_category_enabled(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_notification_email_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_recipient_email text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notification_email_category_enabled(NEW.user_id, NEW.category) THEN
    RETURN NEW;
  END IF;

  SELECT nullif(btrim(u.email), '')
  INTO v_recipient_email
  FROM auth.users u
  WHERE u.id = NEW.user_id;

  IF v_recipient_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_delivery_queue (
    notification_id,
    user_id,
    channel,
    category,
    event_type,
    recipient_email,
    subject,
    body_text,
    payload,
    status,
    next_attempt_at
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    'email',
    NEW.category,
    NEW.event_type,
    v_recipient_email,
    NEW.title,
    NEW.message,
    jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'category', NEW.category,
      'event_type', NEW.event_type,
      'source_table', NEW.source_table,
      'source_id', NEW.source_id,
      'leave_request_id', NEW.leave_request_id,
      'metadata', coalesce(NEW.metadata, '{}'::jsonb)
    ),
    'pending',
    now()
  )
  ON CONFLICT (notification_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification_email_delivery() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_notification_email_delivery() TO service_role;

DROP TRIGGER IF EXISTS zz_after_insert_user_notifications_enqueue_email ON public.user_notifications;
CREATE TRIGGER zz_after_insert_user_notifications_enqueue_email
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_notification_email_delivery();

CREATE OR REPLACE FUNCTION public.run_notification_retention_job(
  _read_notifications_days integer DEFAULT 180,
  _sent_queue_days integer DEFAULT 30,
  _failed_queue_days integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_read_days integer := coalesce(_read_notifications_days, 180);
  v_sent_days integer := coalesce(_sent_queue_days, 30);
  v_failed_days integer := coalesce(_failed_queue_days, 90);
  v_deleted_read_notifications integer := 0;
  v_deleted_sent_queue integer := 0;
  v_deleted_failed_queue integer := 0;
BEGIN
  IF v_read_days < 1 OR v_read_days > 3650 THEN
    RAISE EXCEPTION 'Read notification retention must be between 1 and 3650 days.';
  END IF;
  IF v_sent_days < 1 OR v_sent_days > 3650 THEN
    RAISE EXCEPTION 'Sent queue retention must be between 1 and 3650 days.';
  END IF;
  IF v_failed_days < 1 OR v_failed_days > 3650 THEN
    RAISE EXCEPTION 'Failed queue retention must be between 1 and 3650 days.';
  END IF;

  DELETE FROM public.user_notifications n
  WHERE n.read_at IS NOT NULL
    AND n.created_at < now() - make_interval(days => v_read_days);
  GET DIAGNOSTICS v_deleted_read_notifications = ROW_COUNT;

  DELETE FROM public.notification_delivery_queue q
  WHERE q.status IN ('sent', 'discarded')
    AND coalesce(q.sent_at, q.updated_at, q.created_at) < now() - make_interval(days => v_sent_days);
  GET DIAGNOSTICS v_deleted_sent_queue = ROW_COUNT;

  DELETE FROM public.notification_delivery_queue q
  WHERE q.status = 'failed'
    AND coalesce(q.failed_at, q.updated_at, q.created_at) < now() - make_interval(days => v_failed_days);
  GET DIAGNOSTICS v_deleted_failed_queue = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_read_notifications', v_deleted_read_notifications,
    'deleted_sent_queue', v_deleted_sent_queue,
    'deleted_failed_queue', v_deleted_failed_queue,
    'read_notifications_days', v_read_days,
    'sent_queue_days', v_sent_days,
    'failed_queue_days', v_failed_days,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_notification_retention_job(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_notification_retention_job(integer, integer, integer) TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
     AND EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'cron' AND p.proname = 'schedule'
     )
  THEN
    BEGIN
      SELECT j.jobid INTO v_job_id
      FROM cron.job j
      WHERE j.jobname = 'notification-retention-daily'
      LIMIT 1;

      IF v_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_job_id);
      END IF;

      PERFORM cron.schedule(
        'notification-retention-daily',
        '17 3 * * *',
        'SELECT public.run_notification_retention_job();'
      );
    EXCEPTION
      WHEN undefined_table OR undefined_function OR invalid_schema_name THEN
        NULL;
    END;
  END IF;
END;
$$;

ANALYZE public.notification_delivery_queue;
CREATE OR REPLACE FUNCTION public.notification_worker_claim_email_queue(
  _batch_size integer DEFAULT 20,
  _worker_id text DEFAULT NULL,
  _lease_seconds integer DEFAULT 300,
  _max_attempts integer DEFAULT 10
)
RETURNS SETOF public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_batch_size integer := least(greatest(coalesce(_batch_size, 20), 1), 100);
  v_lease_seconds integer := least(greatest(coalesce(_lease_seconds, 300), 30), 3600);
  v_max_attempts integer := least(greatest(coalesce(_max_attempts, 10), 1), 100);
  v_worker_id text := coalesce(nullif(btrim(_worker_id), ''), 'notification-email-worker');
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT q.id
    FROM public.notification_delivery_queue q
    WHERE q.channel = 'email'
      AND q.attempts < v_max_attempts
      AND (
        (
          q.status IN ('pending', 'failed')
          AND q.next_attempt_at <= now()
        )
        OR (
          q.status = 'processing'
          AND q.leased_at IS NOT NULL
          AND q.leased_at <= now() - make_interval(secs => v_lease_seconds)
        )
      )
    ORDER BY q.next_attempt_at ASC, q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT v_batch_size
  )
  UPDATE public.notification_delivery_queue q
  SET status = 'processing',
      leased_at = now(),
      leased_by = v_worker_id,
      attempts = q.attempts + 1,
      updated_at = now()
  FROM candidates c
  WHERE q.id = c.id
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_claim_email_queue(integer, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_claim_email_queue(integer, text, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.notification_worker_finalize_email_queue_item(
  _queue_id uuid,
  _outcome text,
  _worker_id text DEFAULT NULL,
  _error text DEFAULT NULL,
  _retry_delay_seconds integer DEFAULT 300
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_row public.notification_delivery_queue%ROWTYPE;
  v_outcome text := lower(coalesce(_outcome, ''));
  v_worker_id text := nullif(btrim(_worker_id), '');
  v_retry_delay_seconds integer := least(greatest(coalesce(_retry_delay_seconds, 300), 15), 86400);
BEGIN
  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
  END IF;

  IF v_outcome NOT IN ('sent', 'failed', 'discarded') THEN
    RAISE EXCEPTION 'Invalid outcome. Expected sent, failed, or discarded.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.notification_delivery_queue q
  WHERE q.id = _queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found: %', _queue_id;
  END IF;

  IF v_row.channel <> 'email' THEN
    RAISE EXCEPTION 'Unsupported queue channel for this worker: %', v_row.channel;
  END IF;

  IF v_worker_id IS NOT NULL AND v_row.leased_by IS NOT NULL AND v_row.leased_by <> v_worker_id THEN
    RAISE EXCEPTION 'Queue item % is leased by another worker.', _queue_id;
  END IF;

  IF v_outcome = 'sent' THEN
    UPDATE public.notification_delivery_queue q
    SET status = 'sent',
        sent_at = now(),
        failed_at = NULL,
        last_error = NULL,
        leased_at = NULL,
        leased_by = NULL,
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;

  ELSIF v_outcome = 'failed' THEN
    UPDATE public.notification_delivery_queue q
    SET status = 'failed',
        failed_at = now(),
        last_error = nullif(btrim(_error), ''),
        leased_at = NULL,
        leased_by = NULL,
        next_attempt_at = now() + make_interval(secs => v_retry_delay_seconds),
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;

  ELSE
    UPDATE public.notification_delivery_queue q
    SET status = 'discarded',
        failed_at = coalesce(q.failed_at, now()),
        last_error = coalesce(nullif(btrim(_error), ''), q.last_error, 'discarded'),
        leased_at = NULL,
        leased_by = NULL,
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_finalize_email_queue_item(uuid, text, text, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_finalize_email_queue_item(uuid, text, text, text, integer)
  TO service_role;
CREATE OR REPLACE FUNCTION public.notification_admin_email_queue_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_pending_count integer := 0;
  v_processing_count integer := 0;
  v_failed_count integer := 0;
  v_sent_count integer := 0;
  v_discarded_count integer := 0;
  v_ready_to_retry_count integer := 0;
  v_oldest_pending_at timestamptz;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  SELECT
    count(*) FILTER (WHERE q.status = 'pending'),
    count(*) FILTER (WHERE q.status = 'processing'),
    count(*) FILTER (WHERE q.status = 'failed'),
    count(*) FILTER (WHERE q.status = 'sent'),
    count(*) FILTER (WHERE q.status = 'discarded'),
    count(*) FILTER (
      WHERE q.status = 'failed'
        AND q.next_attempt_at <= now()
    ),
    min(q.created_at) FILTER (WHERE q.status = 'pending')
  INTO
    v_pending_count,
    v_processing_count,
    v_failed_count,
    v_sent_count,
    v_discarded_count,
    v_ready_to_retry_count,
    v_oldest_pending_at
  FROM public.notification_delivery_queue q
  WHERE q.channel = 'email';

  RETURN jsonb_build_object(
    'pending_count', v_pending_count,
    'processing_count', v_processing_count,
    'failed_count', v_failed_count,
    'sent_count', v_sent_count,
    'discarded_count', v_discarded_count,
    'ready_to_retry_failed_count', v_ready_to_retry_count,
    'oldest_pending_at', v_oldest_pending_at,
    'generated_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_list_email_queue(
  _status text DEFAULT 'all',
  _limit integer DEFAULT 25,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_status text := lower(coalesce(nullif(btrim(_status), ''), 'all'));
  v_limit integer := least(greatest(coalesce(_limit, 25), 1), 200);
  v_offset integer := greatest(coalesce(_offset, 0), 0);
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  IF v_status NOT IN ('all', 'pending', 'processing', 'failed', 'sent', 'discarded') THEN
    RAISE EXCEPTION 'Invalid queue status filter: %', v_status;
  END IF;

  RETURN QUERY
  SELECT q.*
  FROM public.notification_delivery_queue q
  WHERE q.channel = 'email'
    AND (v_status = 'all' OR q.status = v_status)
  ORDER BY
    CASE q.status
      WHEN 'failed' THEN 0
      WHEN 'processing' THEN 1
      WHEN 'pending' THEN 2
      WHEN 'discarded' THEN 3
      WHEN 'sent' THEN 4
      ELSE 5
    END,
    q.next_attempt_at ASC,
    q.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_requeue_email_queue_item(
  _queue_id uuid,
  _delay_seconds integer DEFAULT 0
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_delay_seconds integer := least(greatest(coalesce(_delay_seconds, 0), 0), 86400);
  v_row public.notification_delivery_queue%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.notification_delivery_queue q
  WHERE q.id = _queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found: %', _queue_id;
  END IF;

  IF v_row.channel <> 'email' THEN
    RAISE EXCEPTION 'Unsupported queue channel: %', v_row.channel;
  END IF;

  IF v_row.status = 'sent' THEN
    RAISE EXCEPTION 'Cannot requeue a sent notification.';
  END IF;

  UPDATE public.notification_delivery_queue q
  SET status = 'pending',
      attempts = 0,
      next_attempt_at = now() + make_interval(secs => v_delay_seconds),
      leased_at = NULL,
      leased_by = NULL,
      sent_at = NULL,
      failed_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE q.id = _queue_id
  RETURNING q.* INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_discard_email_queue_item(
  _queue_id uuid,
  _reason text DEFAULT NULL
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_row public.notification_delivery_queue%ROWTYPE;
  v_reason text := nullif(btrim(_reason), '');
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.notification_delivery_queue q
  WHERE q.id = _queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found: %', _queue_id;
  END IF;

  IF v_row.channel <> 'email' THEN
    RAISE EXCEPTION 'Unsupported queue channel: %', v_row.channel;
  END IF;

  IF v_row.status = 'sent' THEN
    RAISE EXCEPTION 'Cannot discard a sent notification.';
  END IF;

  UPDATE public.notification_delivery_queue q
  SET status = 'discarded',
      leased_at = NULL,
      leased_by = NULL,
      failed_at = coalesce(q.failed_at, now()),
      last_error = coalesce(v_reason, q.last_error, 'discarded by admin ops'),
      updated_at = now()
  WHERE q.id = _queue_id
  RETURNING q.* INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_admin_email_queue_summary()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_list_email_queue(text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_requeue_email_queue_item(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_discard_email_queue_item(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.notification_admin_email_queue_summary()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_list_email_queue(text, integer, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_requeue_email_queue_item(uuid, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_discard_email_queue_item(uuid, text)
  TO authenticated, service_role;
-- Policy shift: system admin can manage app configuration (non-sensitive tables)
-- while payroll/salary and sensitive employee identifiers remain restricted.

ALTER POLICY departments_insert_hr_director ON public.departments
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY departments_update_hr_director ON public.departments
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY departments_delete_hr_director ON public.departments
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_insert_hr_director ON public.leave_types
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_update_hr_director ON public.leave_types
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_delete_hr_director ON public.leave_types
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_insert_hr_director ON public.holidays
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_update_hr_director ON public.holidays
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_delete_hr_director ON public.holidays
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY department_events_select_authenticated ON public.department_events
  USING (
    (department_id IN (
      SELECT profiles.department_id
      FROM profiles
      WHERE profiles.id = request_user_id()
    ))
    OR department_id IS NULL
    OR has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_insert_privileged ON public.department_events
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_update_privileged ON public.department_events
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_delete_privileged ON public.department_events
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY announcements_insert_hr_director ON public.announcements
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY announcements_update_hr_director ON public.announcements
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY announcements_delete_hr_director ON public.announcements
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );
-- Strict server-side masking for admin-facing employee directory profile reads.
-- Admin retains broad app-config access but should not receive sensitive employee identifiers/contact values.

CREATE OR REPLACE FUNCTION public.get_employee_directory_profiles(_profile_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  employee_id text,
  email text,
  username text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  department_id uuid,
  job_title text,
  hire_date date,
  manager_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  department jsonb
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH caller AS (
    SELECT public.has_role(public.request_user_id(), 'admin'::public.app_role) AS is_admin
  )
  SELECT
    p.id,
    CASE WHEN caller.is_admin THEN NULL ELSE p.employee_id END AS employee_id,
    p.email,
    p.username,
    p.first_name,
    p.last_name,
    CASE WHEN caller.is_admin THEN NULL ELSE p.phone END AS phone,
    p.avatar_url,
    p.department_id,
    p.job_title,
    p.hire_date,
    p.manager_id,
    p.status,
    p.created_at,
    p.updated_at,
    CASE
      WHEN d.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'manager_id', d.manager_id,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      )
    END AS department
  FROM public.profiles p
  LEFT JOIN public.departments d
    ON d.id = p.department_id
  CROSS JOIN caller
  WHERE _profile_id IS NULL OR p.id = _profile_id
  ORDER BY p.first_name, p.last_name;
$$;

REVOKE ALL ON FUNCTION public.get_employee_directory_profiles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_directory_profiles(uuid) TO authenticated, service_role;
-- Ensure anon cannot execute admin-masked employee directory RPC.

REVOKE ALL ON FUNCTION public.get_employee_directory_profiles(uuid) FROM anon;
