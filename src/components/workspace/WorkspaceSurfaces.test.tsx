import { Building2, Users } from 'lucide-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DrawerMetaHeader } from '@/components/workspace/DrawerMetaHeader';
import { WorkspaceMetricStrip } from '@/components/workspace/WorkspaceMetricStrip';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

describe('workspace UX primitives', () => {
  it('renders metric items with descriptions', () => {
    render(
      <WorkspaceMetricStrip
        items={[
          {
            id: 'employees',
            label: 'Employees',
            value: 42,
            description: 'Visible across the workspace.',
            icon: Users,
          },
        ]}
      />,
    );

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Visible across the workspace.')).toBeInTheDocument();
  });

  it('renders state messaging with title and description', () => {
    render(
      <WorkspaceStatePanel
        title="No records available"
        description="Adjust the filters to broaden the result set."
      />,
    );

    expect(screen.getByText('No records available')).toBeInTheDocument();
    expect(screen.getByText('Adjust the filters to broaden the result set.')).toBeInTheDocument();
  });

  it('renders drawer metadata badges and summary values', () => {
    render(
      <DrawerMetaHeader
        badges={<span>Pending</span>}
        description="Annual leave request"
        metaItems={[
          {
            id: 'requester',
            label: 'Requester',
            value: 'Jane Doe',
            icon: Building2,
          },
        ]}
      />,
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Annual leave request')).toBeInTheDocument();
    expect(screen.getByText('Requester')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
