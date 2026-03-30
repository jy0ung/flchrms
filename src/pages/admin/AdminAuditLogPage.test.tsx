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

    return { data: [], isLoading: false };
  },
}));

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
    mockAuditDataLoading = false;
    mockWorkflowEvents = [];
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
    expect(screen.getByText('Workflow Config Change')).toBeInTheDocument();
    expect(screen.getByText('leave approval: updated')).toBeInTheDocument();
    expect(screen.getByText('Amy Admin')).toBeInTheDocument();
  });

  it('renders a task-state empty view when there are no audit entries', () => {
    render(<AdminAuditLogPage />);

    expect(screen.getByText('No audit entries in the last 30 days')).toBeInTheDocument();
  });

  it('renders a structured loading preview while governance audit access resolves', () => {
    mockCapabilityLoading = true;

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Loading audit log')).toBeInTheDocument();
    expect(screen.getByText('Recent governance history')).toBeInTheDocument();
  });

  it('keeps the audit table shape visible while audit entries are still loading', () => {
    mockAuditDataLoading = true;

    render(<AdminAuditLogPage />);

    expect(screen.getByText('Recent governance history')).toBeInTheDocument();
    expect(
      screen.getByText('Loading workflow, leave, and profile activity for the current governance review window.'),
    ).toBeInTheDocument();
  });
});
