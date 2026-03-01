import type { EmployeeStatus } from '@/types/hrms';

export type AdminEditProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone: string;
  job_title: string;
  department_id: string;
  employee_id: string;
  status: EmployeeStatus;
  hire_date: string;
  manager_id: string;
};

export type AdminResetPasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

export type AdminDepartmentForm = {
  name: string;
  description: string;
};

export type AdminCreateEmployeeForm = {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone: string;
  job_title: string;
  department_id: string;
  hire_date: string;
  manager_id: string;
};

export type AdminLeaveTypeForm = {
  name: string;
  description: string;
  days_allowed: number;
  min_days: number;
  is_paid: boolean;
  requires_document: boolean;
};
