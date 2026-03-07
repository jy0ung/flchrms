import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityTimeline } from '@/components/activity/ActivityTimeline';

describe('ActivityTimeline', () => {
  it('renders loading state', () => {
    render(
      <ActivityTimeline
        items={[]}
        isLoading
        title="Recent Activity"
        emptyMessage="Nothing here."
      />,
    );

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <ActivityTimeline
        items={[]}
        title="Recent Activity"
        emptyMessage="Nothing here."
      />,
    );

    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('renders timeline entries with actor labels and kind badges', () => {
    render(
      <ActivityTimeline
        title="Approval History"
        emptyMessage="Nothing here."
        items={[
          {
            id: '1',
            at: '2026-03-07T10:00:00Z',
            title: 'Manager Approved',
            actorLabel: 'Jane Doe (Manager)',
            description: 'Approved after balance review.',
            kind: 'approval',
          },
        ]}
      />,
    );

    expect(screen.getByText('Manager Approved')).toBeInTheDocument();
    expect(screen.getByText('By Jane Doe (Manager)')).toBeInTheDocument();
    expect(screen.getByText('Approved after balance review.')).toBeInTheDocument();
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });
});
