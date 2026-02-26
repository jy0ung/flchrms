import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationQueueOpsSection } from '@/components/admin/NotificationQueueOpsSection';

const requeueItem = vi.fn();
const discardItem = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/useNotificationQueueOps', () => ({
  useNotificationQueueOps: () => ({
    summary: {
      pending_count: 1,
      processing_count: 1,
      failed_count: 1,
      sent_count: 1,
      discarded_count: 0,
      ready_to_retry_failed_count: 1,
      oldest_pending_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      generated_at: new Date().toISOString(),
    },
    queueItems: [
      {
        id: 'queue-1',
        user_id: 'user-1',
        notification_id: null,
        status: 'failed',
        attempts: 2,
        max_attempts: 5,
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        leased_at: null,
        lease_expires_at: null,
        leased_by: null,
        provider_message_id: null,
        provider_payload: null,
        last_error: 'provider timeout',
        recipient_email: 'employee@flchrms.test',
        subject: 'Payroll notification',
        body_html: '<p>Hello</p>',
        body_text: 'Hello',
        event_type: 'leave_final_approved',
        category: 'leave',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_provider: 'stub',
        user_profile: {
          id: 'user-1',
          first_name: 'Evelyn',
          last_name: 'Employee',
          email: 'employee@flchrms.test',
        },
      },
    ],
    workerRunSummary: {
      running_count: 1,
      completed_24h_count: 4,
      failed_24h_count: 1,
      claimed_24h_count: 10,
      processed_24h_count: 10,
      sent_24h_count: 8,
      failed_items_24h_count: 2,
      discarded_24h_count: 1,
      avg_duration_ms_24h: 1200,
      latest_started_at: new Date().toISOString(),
      latest_completed_at: new Date().toISOString(),
      latest_failed_at: null,
      generated_at: new Date().toISOString(),
    },
    workerRuns: [
      {
        id: 'run-1',
        worker_id: 'worker-1',
        provider: 'stub',
        run_status: 'running',
        requested_batch_size: 25,
        claim_horizon_minutes: 15,
        claimed_count: 5,
        processed_count: 5,
        sent_count: 4,
        failed_count: 1,
        discarded_count: 0,
        started_at: new Date().toISOString(),
        finished_at: null,
        duration_ms: null,
        error_message: null,
        created_at: new Date().toISOString(),
      },
    ],
    deadLetterAnalytics: {
      window_hours: 24,
      generated_at: new Date().toISOString(),
      window_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      dead_letter_count: 2,
      failed_count: 1,
      discarded_count: 1,
      retry_ready_failed_count: 1,
      providers: [],
      event_types: [],
      provider_event_types: [],
      top_errors: [],
    },
    isLoading: false,
    isFetching: false,
    summaryError: null,
    listError: null,
    workerRunSummaryError: null,
    workerRunListError: null,
    deadLetterAnalyticsError: null,
    isRequeueing: false,
    isDiscarding: false,
    refetch: vi.fn(),
    requeueItem,
    discardItem,
  }),
}));

describe('NotificationQueueOpsSection status normalization', () => {
  it('renders queue and worker run statuses through shared status labels', () => {
    render(<NotificationQueueOpsSection />);

    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Requeue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discard/i })).toBeInTheDocument();
  });
});
