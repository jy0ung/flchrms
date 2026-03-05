export type AppRole = 'admin' | 'hr' | 'manager' | 'employee' | 'general_manager' | 'director';

export type LeaveStatus = 'pending' | 'manager_approved' | 'gm_approved' | 'director_approved' | 'hr_approved' | 'rejected' | 'cancelled';
export type LeaveApprovalStage = 'manager' | 'general_manager' | 'director';
export type LeaveCancellationStatus =
  | 'pending'
  | 'manager_approved'
  | 'gm_approved'
  | 'director_approved'
  | 'approved'
  | 'rejected';

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export type TrainingStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped';

export type ReviewStatus = 'draft' | 'submitted' | 'acknowledged';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Profile {
  id: string;
  employee_id: string | null;
  email: string;
  username: string;
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
  min_days: number;
  requires_document: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  requested_units?: number | null;
  reason: string | null;
  status: LeaveStatus;
  policy_version_id?: string | null;
  decision_trace?: Record<string, unknown> | null;
  approval_route_snapshot: LeaveApprovalStage[] | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  gm_approved_by: string | null;
  gm_approved_at: string | null;
  director_approved_by: string | null;
  director_approved_at: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  hr_notified_at: string | null;
  final_approved_by: string | null;
  final_approved_by_role: AppRole | null;
  final_approved_at: string | null;
  cancellation_status: LeaveCancellationStatus | null;
  cancellation_route_snapshot: LeaveApprovalStage[] | null;
  cancellation_requested_by: string | null;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  cancellation_comments: string | null;
  cancellation_manager_approved_by: string | null;
  cancellation_manager_approved_at: string | null;
  cancellation_gm_approved_by: string | null;
  cancellation_gm_approved_at: string | null;
  cancellation_director_approved_by: string | null;
  cancellation_director_approved_at: string | null;
  cancellation_final_approved_by: string | null;
  cancellation_final_approved_by_role: AppRole | null;
  cancellation_final_approved_at: string | null;
  cancellation_rejected_by: string | null;
  cancellation_rejected_at: string | null;
  cancellation_rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_by_role: AppRole | null;
  cancelled_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  document_url: string | null;
  document_required: boolean;
  manager_comments: string | null;
  amendment_notes: string | null;
  amended_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Partial<Profile>;
  leave_type?: LeaveType;
}

export interface LeaveApprovalWorkflow {
  id: string;
  requester_role: AppRole;
  department_id: string | null;
  approval_stages: LeaveApprovalStage[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveCancellationWorkflow {
  id: string;
  requester_role: AppRole;
  department_id: string | null;
  approval_stages: LeaveApprovalStage[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LeaveCapability =
  | 'preview_request'
  | 'submit_request_v2'
  | 'decide_request'
  | 'cancel_request_v2'
  | 'run_accrual_cycle'
  | 'close_period'
  | 'export_payroll_inputs'
  | 'generate_liability_snapshot'
  | 'run_forecast';

export interface LeavePolicyDecision {
  id: string;
  leave_request_id: string;
  stage: string;
  action:
    | 'submit'
    | 'approve'
    | 'reject'
    | 'request_document'
    | 'cancel_request'
    | 'cancel_approve'
    | 'cancel_reject'
    | 'override';
  decided_by: string | null;
  decided_at: string;
  decision_reason: string | null;
  comments: string | null;
  from_status: string | null;
  to_status: string | null;
  from_cancellation_status: string | null;
  to_cancellation_status: string | null;
  metadata: Record<string, unknown>;
}

export interface LeaveBalanceLedgerEntry {
  id: string;
  employee_id: string;
  leave_type_id: string;
  policy_version_id: string | null;
  entry_type: 'grant' | 'accrue' | 'consume' | 'expire' | 'adjust' | 'encash' | 'reverse';
  occurred_on: string;
  posted_at: string;
  quantity: number;
  reason: string | null;
  source: string;
  source_ref: string | null;
  balance_after: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface LeavePreviewResult {
  can_submit: boolean;
  employee_id: string;
  leave_type_id: string;
  leave_type_name: string | null;
  start_date: string;
  end_date: string;
  requested_units: number;
  policy_version_id: string | null;
  rule_unit: 'day' | 'half_day' | 'hour';
  requires_document: boolean;
  allow_negative_balance: boolean;
  max_consecutive_days: number | null;
  min_notice_days: number;
  entitled_balance: number;
  consumed_balance: number;
  pending_balance: number;
  available_balance: number;
  balance_source: string;
  hard_errors: string[];
  soft_warnings: string[];
  reason: string | null;
}

export interface LeaveLiabilitySnapshotEntry {
  id: string;
  snapshot_date: string;
  employee_id: string;
  leave_type_id: string;
  policy_version_id: string | null;
  balance_days: number;
  daily_rate: number;
  estimated_amount: number;
  currency_code: string;
  scope: Record<string, unknown>;
  run_tag: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface LeaveLiabilitySnapshotResult {
  as_of: string;
  policy_version_id: string;
  dry_run: boolean;
  planned_rows: number;
  written_rows: number;
  total_days: number;
  estimated_amount: number;
  currency_code: string;
  scope: Record<string, unknown>;
  run_tag: string | null;
}

export interface LeaveForecastRow {
  id: string;
  forecast_run_id: string;
  employee_id: string;
  leave_type_id: string;
  month_start: string;
  opening_balance: number;
  projected_accrual: number;
  projected_consumption: number;
  projected_closing_balance: number;
  projected_liability: number;
  daily_rate: number;
  currency_code: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeaveForecastResult {
  forecast_run_id: string | null;
  as_of: string;
  horizon_months: number;
  policy_version_id: string;
  dry_run: boolean;
  employees: number;
  planned_rows: number;
  written_rows: number;
  total_projected_days: number;
  total_projected_amount: number;
  currency_code: string;
  scope: Record<string, unknown>;
  run_tag: string | null;
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
