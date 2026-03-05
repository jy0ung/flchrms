import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModalScaffold, ModalSection } from '@/components/system';
import type { Department, Profile } from '@/types/hrms';
import type { AdminCreateEmployeeForm } from '@/components/admin/admin-form-types';

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AdminCreateEmployeeForm;
  onFormChange: (next: AdminCreateEmployeeForm) => void;
  onSubmit: () => void;
  isPending: boolean;
  departments?: Department[];
  employees?: (Profile & { department: Department | null })[];
}

type CreateEmployeeValidationErrors = {
  email?: string;
  first_name?: string;
  password?: string;
  confirmPassword?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getValidationErrors(form: AdminCreateEmployeeForm): CreateEmployeeValidationErrors {
  const errors: CreateEmployeeValidationErrors = {};

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!form.password) {
    errors.password = 'Temporary password is required.';
  } else if (form.password.length < 6) {
    errors.password = 'Temporary password must be at least 6 characters.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm the temporary password.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function CreateEmployeeDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isPending,
  departments,
  employees,
}: CreateEmployeeDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const validationErrors = getValidationErrors(form);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const showFieldError = (field: keyof CreateEmployeeValidationErrors) =>
    submitAttempted || Boolean(touched[field]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowPassword(false);
      setSubmitAttempted(false);
      setTouched({});
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (hasValidationErrors) {
      return;
    }
    onSubmit();
  };

  return (
    <ModalScaffold
      open={open}
      onOpenChange={handleClose}
      title="Create Employee"
      description="Create a new employee account with a temporary password. They will be able to sign in immediately."
      maxWidth="2xl"
      body={(
        <div className="space-y-4">
          <ModalSection title="Account Credentials">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="create-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                  onBlur={() => setTouched((previous) => ({ ...previous, email: true }))}
                  placeholder="employee@company.com"
                  autoComplete="off"
                  aria-invalid={showFieldError('email') && !!validationErrors.email}
                />
                {showFieldError('email') && validationErrors.email && (
                  <p className="text-xs text-destructive">{validationErrors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-password">Temporary Password <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="create-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                      onBlur={() => setTouched((previous) => ({ ...previous, password: true }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                      aria-invalid={showFieldError('password') && !!validationErrors.password}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {showFieldError('password') && validationErrors.password && (
                    <p className="text-xs text-destructive">{validationErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-confirm-password">Confirm Password <span className="text-destructive">*</span></Label>
                  <Input
                    id="create-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => onFormChange({ ...form, confirmPassword: e.target.value })}
                    onBlur={() => setTouched((previous) => ({ ...previous, confirmPassword: true }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={6}
                    aria-invalid={showFieldError('confirmPassword') && !!validationErrors.confirmPassword}
                  />
                  {showFieldError('confirmPassword') && validationErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters. The employee should change it after first sign-in.
              </p>
            </div>
          </ModalSection>

          <ModalSection title="Personal Information">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-first-name">First Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="create-first-name"
                    value={form.first_name}
                    onChange={(e) => onFormChange({ ...form, first_name: e.target.value })}
                    onBlur={() => setTouched((previous) => ({ ...previous, first_name: true }))}
                    placeholder="John"
                    aria-invalid={showFieldError('first_name') && !!validationErrors.first_name}
                  />
                  {showFieldError('first_name') && validationErrors.first_name && (
                    <p className="text-xs text-destructive">{validationErrors.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-last-name">Last Name</Label>
                  <Input
                    id="create-last-name"
                    value={form.last_name}
                    onChange={(e) => onFormChange({ ...form, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={form.phone}
                  onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                  placeholder="+1 555-0100"
                />
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Employment Details">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-job-title">Job Title</Label>
                  <Input
                    id="create-job-title"
                    value={form.job_title}
                    onChange={(e) => onFormChange({ ...form, job_title: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-department">Department</Label>
                  <Select
                    value={form.department_id}
                    onValueChange={(value) => onFormChange({ ...form, department_id: value })}
                  >
                    <SelectTrigger id="create-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="create-hire-date">Hire Date</Label>
                  <Input
                    id="create-hire-date"
                    type="date"
                    value={form.hire_date}
                    onChange={(e) => onFormChange({ ...form, hire_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-manager">Manager</Label>
                  <Select
                    value={form.manager_id}
                    onValueChange={(value) => onFormChange({ ...form, manager_id: value })}
                  >
                    <SelectTrigger id="create-manager">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ModalSection>

          <ModalSection tone="muted" compact>
            <p className="text-xs text-muted-foreground">
              Employee ID and username will be auto-generated on creation. The employee will be assigned
              the default <strong>employee</strong> role. You can change their role from the Roles tab after creation.
            </p>
          </ModalSection>
        </div>
      )}
      footer={(
        <>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Employee'}
          </Button>
        </>
      )}
    />
  );
}
