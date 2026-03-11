import { Building2, Users } from 'lucide-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DrawerMetaHeader } from '@/components/workspace/DrawerMetaHeader';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { RecordSurfaceHeader } from '@/components/system/RecordSurfaceHeader';

describe('workspace UX primitives', () => {
  it('renders summary items in card mode with descriptions', () => {
    render(
      <SummaryRail
        items={[
          {
            id: 'employees',
            label: 'Employees',
            value: 42,
            helper: 'Visible across the workspace.',
            icon: Users,
          },
        ]}
        variant="cards"
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

  it('renders compact summary items for high-signal workspace metrics', () => {
    render(
      <SummaryRail
        items={[
          {
            id: 'active',
            label: 'Active',
            value: 18,
            helper: 'Records requiring day-to-day attention.',
          },
        ]}
      />,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Records requiring day-to-day attention.')).toBeInTheDocument();
  });

  it('renders subtle summary items without the legacy contained card shell', () => {
    render(
      <SummaryRail
        variant="subtle"
        items={[
          {
            id: 'on-leave',
            label: 'On leave',
            value: 3,
            helper: 'Unavailable employees today.',
          },
        ]}
      />,
    );

    expect(screen.getByText('On leave')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Unavailable employees today.')).toBeInTheDocument();
  });

  it('renders the canonical summary rail with optional icons', () => {
    render(
      <SummaryRail
        items={[
          {
            id: 'departments',
            label: 'Departments',
            value: 7,
            helper: 'Departments currently represented in this workspace.',
            icon: Building2,
          },
        ]}
      />,
    );

    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Departments currently represented in this workspace.')).toBeInTheDocument();
  });

  it('renders record surface metadata and actions', () => {
    render(
      <RecordSurfaceHeader
        title="Employees"
        description="Filtered records in the current workspace view."
        meta={<span>12 results</span>}
        actions={<button type="button">Export</button>}
      />,
    );

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('12 results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
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
