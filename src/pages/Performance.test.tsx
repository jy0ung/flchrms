import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Performance from '@/pages/Performance';

const acknowledgeMutate = vi.fn();

vi.mock('@/hooks/usePerformance', () => ({
  useMyReviews: () => ({
    data: [
      {
        id: 'rev-1',
        employee_id: 'user-1',
        reviewer_id: 'mgr-1',
        review_period: 'Q1 2026',
        status: 'submitted',
        overall_rating: 4,
        strengths: 'Ownership',
        areas_for_improvement: 'Documentation',
        goals: 'Improve planning',
        comments: null,
        submitted_at: '2026-02-20T00:00:00.000Z',
        acknowledged_at: null,
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-20T00:00:00.000Z',
        reviewer: {
          id: 'mgr-1',
          first_name: 'Mason',
          last_name: 'Manager',
        },
      },
    ],
    isLoading: false,
  }),
  useAcknowledgeReview: () => ({ mutate: acknowledgeMutate, isPending: false }),
}));

describe('Performance operational status badges', () => {
  it('renders semantic review status and acknowledge action', () => {
    render(<Performance />);

    expect(screen.getByText(/My Reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Acknowledgement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submitted status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acknowledge/i })).toBeInTheDocument();
  });
});
