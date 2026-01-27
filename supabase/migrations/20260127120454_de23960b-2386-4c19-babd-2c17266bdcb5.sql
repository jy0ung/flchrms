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