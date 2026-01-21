export type AppRole = 'admin' | 'hr' | 'manager' | 'employee';

export type LeaveStatus = 'pending' | 'manager_approved' | 'hr_approved' | 'rejected' | 'cancelled';

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export type TrainingStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped';

export type ReviewStatus = 'draft' | 'submitted' | 'acknowledged';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Profile {
  id: string;
  employee_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  department_id: string | null;
  job_title: string | null;
  hire_date: string | null;
  manager_id: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  department?: Department;
  manager?: Profile;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  days_allowed: number;
  is_paid: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: LeaveStatus;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: Profile;
  leave_type?: LeaveType;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  is_mandatory: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingEnrollment {
  id: string;
  employee_id: string;
  program_id: string;
  status: TrainingStatus;
  enrolled_at: string;
  completed_at: string | null;
  score: number | null;
  program?: TrainingProgram;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals: string | null;
  comments: string | null;
  status: ReviewStatus;
  submitted_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Profile;
  reviewer?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_by: string | null;
  published_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  upcomingReviews: number;
  activeTrainings: number;
}
