import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';

let mockCapabilityLoading = false;
let mockAuditDataLoading = false;
let mockWorkflowEvents: Array<{
  id: string;
  workflow_type: string;
  event_type: string;
  changed_by_user_id: string | null;
  department_id: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata: unknown;
  created_at: string;
  actor: { first_name: string; last_name: string } | null;
}> = [];
let mockAnnouncementAudits: Array<{
  id: string;
  announcement_id: string;
  action: 'create' | 'update' | 'delete';
  reason: string;
  old_values: { title?: string | null } | null;
  new_values: { title?: string | null } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}> = [];
let mockBrandingAudits: Array<{
  id: string;
  branding_id: string;
  reason: string;
  old_values: { company_name?: string | null } | null;
  new_values: { company_name?: string | null } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}> = [];
let mockRoleAudits: Array<{
  id: string;
  user_id: string;
  action: 'assign' | 'update' | 'remove';
  old_role: string | null;
  new_role: string | null;
  reason: string;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}> = [];
let mockTenantSettingsAudits: Array<{
  id: string;
  settings_id: string;
  reason: string;
  old_values: {
    maintenance_mode?: boolean | null;
    session_timeout_minutes?: number | null;
  } | null;
  new_values: {
    maintenance_mode?: boolean | null;
    session_timeout_minutes?: number | null;
  } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}> = [];

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canViewAdminAuditLog: true,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [{ id: 'emp-1', first_name: 'Amy', last_name: 'Admin' }],
  }),
}));

vi.mock('@/hooks/useWorkflowConfigEvents', () => ({
  useWorkflowConfigEvents: () => ({
    data: mockWorkflowEvents,
    isLoading: mockAuditDataLoading,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'admin-audit-leaves') {
      return { data: [], isLoading: mockAuditDataLoading };
    }

    if (queryKey[0] === 'admin-audit-profiles') {
      return { data: [], isLoading: mockAuditDataLoading };
    }

    if (queryKey[0] === 'admin-audit-announcements') {
      return { data: mockAnnouncementAudits, isLoading: mockAuditDataLoading };
    }

    if (queryKey[0] === 'admin-audit-branding') {
      return { data: mockBrandingAudits, isLoading: mockAuditDataLoading };
    }

    if (queryKey[0] === 'admin-audit-user-roles') {
      return { data: mockRoleAudits, isLoading: mockAuditDataLoading };
    }

    if (queryKey[0] === 'admin-audit-tenant-settings') {
      return { data: mockTenantSettingsAudits, isLoading: mockAuditDataLoading };
    }

    return { data: [], isLoading: false };
  },
}));

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
    mockAuditDataLoading = false;
    mockWorkflowEvents = [];
    mockAnnouncementAudits = [];
    mockBrandingAudits = [];
    mockRoleAudits = [];
    mockTenantSettingsAudits = [];
  });

  it('renders workflow config events without querying the legacy audit table directly', () => {
    mockWorkflowEvents = [
      {
        id: 'wf-1',
        workflow_type: 'leave_approval',
        event_type: 'updated',
        changed_by_user_id: 'emp-1',
        department_id: null,
        old_value: null,
        new_value: null,
        metadata: null,
        created_at: '2026-03-10T00:00:00.000Z',
        actor: { first_name: 'Amy', last_name: 'Admin' },
      },
    ];

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Current workspace')).toBeInTheDocument();
    expect(screen.getByText('Governance review window and audit history')).toBeInTheDocument();
    expect(screen.getByText('Workflow changes')).toBeInTheDocument();
    expect(screen.getByText('Workflow Config Change')).toBeInTheDocument();
    expect(screen.getByText('leave approval: updated')).toBeInTheDocument();
    expect(screen.getByText('Amy Admin')).toBeInTheDocument();
  });

  it('renders a task-state empty view when there are no audit entries', () => {
    render(<AdminAuditLogPage />);

    expect(screen.getByText('No audit entries in the last 30 days')).toBeInTheDocument();
  });

  it('surfaces announcement governance changes with the operator reason', () => {
    mockAnnouncementAudits = [
      {
        id: 'ann-audit-1',
        announcement_id: 'ann-1',
        action: 'update',
        reason: 'Clarified the policy reminder before payroll cutoff.',
        old_values: { title: 'Payroll Reminder' },
        new_values: { title: 'Payroll Reminder' },
        changed_by: 'emp-1',
        changed_by_role: 'admin',
        changed_at: '2026-03-12T00:00:00.000Z',
      },
    ];

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Announcement Change')).toBeInTheDocument();
    expect(screen.getByText('update: Payroll Reminder')).toBeInTheDocument();
    expect(screen.getByText('Clarified the policy reminder before payroll cutoff.')).toBeInTheDocument();
  });

  it('surfaces branding governance changes with the operator reason', () => {
    mockBrandingAudits = [
      {
        id: 'branding-audit-1',
        branding_id: 'branding-1',
        reason: 'Updated the tenant identity for the new corporate naming rollout.',
        old_values: { company_name: 'FL Group' },
        new_values: { company_name: 'FL Group Holdings' },
        changed_by: 'emp-1',
        changed_by_role: 'admin',
        changed_at: '2026-03-14T00:00:00.000Z',
      },
    ];

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Branding Change')).toBeInTheDocument();
    expect(screen.getByText('FL Group Holdings')).toBeInTheDocument();
    expect(screen.getByText('Updated the tenant identity for the new corporate naming rollout.')).toBeInTheDocument();
  });

  it('surfaces user role governance changes with the operator reason', () => {
    mockRoleAudits = [
      {
        id: 'role-audit-1',
        user_id: 'emp-1',
        action: 'update',
        old_role: 'employee',
        new_role: 'manager',
        reason: 'Promoted after the team lead transition.',
        changed_by: 'emp-1',
        changed_by_role: 'admin',
        changed_at: '2026-03-15T00:00:00.000Z',
      },
    ];

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Role Assignment Change')).toBeInTheDocument();
    expect(screen.getAllByText('Amy Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('update -> manager: Promoted after the team lead transition.')).toBeInTheDocument();
  });

  it('surfaces tenant settings governance changes with the operator reason', () => {
    mockTenantSettingsAudits = [
      {
        id: 'tenant-settings-audit-1',
        settings_id: 'tenant-settings-1',
        reason: 'Enabled maintenance mode before the infrastructure patch window.',
        old_values: { maintenance_mode: false, session_timeout_minutes: 30 },
        new_values: { maintenance_mode: true, session_timeout_minutes: 45 },
        changed_by: 'emp-1',
        changed_by_role: 'admin',
        changed_at: '2026-03-16T00:00:00.000Z',
      },
    ];

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Tenant Settings Change')).toBeInTheDocument();
    expect(screen.getByText('maintenance on · timeout 45 min')).toBeInTheDocument();
    expect(screen.getByText('Enabled maintenance mode before the infrastructure patch window.')).toBeInTheDocument();
  });

  it('renders a structured loading preview while governance audit access resolves', () => {
    mockCapabilityLoading = true;

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Loading audit log')).toBeInTheDocument();
    expect(screen.getByText('Recent governance history')).toBeInTheDocument();
  });

  it('keeps the audit table shape visible while audit entries are still loading', () => {
    mockAuditDataLoading = true;

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Recent governance history')).toBeInTheDocument();
    expect(
      screen.getByText('Loading workflow, leave, announcement, branding, tenant settings, role, and profile activity for the current governance review window.'),
    ).toBeInTheDocument();
  });
});
