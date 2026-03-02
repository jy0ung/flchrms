import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Training from '@/pages/Training';

// ── Mock data ────────────────────────────────────────────────────
let mockPrograms: unknown[] | undefined;
let mockProgramsLoading = false;
let mockProgramsError = false;
let mockEnrollments: unknown[] | undefined;
let mockEnrollmentsLoading = false;
const mockMutate = vi.fn();
let mockRefetch = vi.fn();

vi.mock('@/hooks/useTraining', () => ({
  useTrainingPrograms: () => ({
    data: mockPrograms,
    isLoading: mockProgramsLoading,
    isError: mockProgramsError,
    refetch: mockRefetch,
  }),
  useMyEnrollments: () => ({
    data: mockEnrollments,
    isLoading: mockEnrollmentsLoading,
  }),
  useEnrollInProgram: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

beforeEach(() => {
  mockPrograms = [];
  mockProgramsLoading = false;
  mockProgramsError = false;
  mockEnrollments = [];
  mockEnrollmentsLoading = false;
  mockMutate.mockClear();
  mockRefetch = vi.fn();
});

describe('Training page', () => {
  it('shows error state with retry when programs fail to load', () => {
    mockProgramsError = true;
    render(<Training />, { wrapper });
    // QueryErrorState typically shows a "Retry" button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows empty message when no programs available', () => {
    mockPrograms = [];
    render(<Training />, { wrapper });
    expect(screen.getByText(/no training programs available/i)).toBeInTheDocument();
  });

  it('renders program cards', () => {
    mockPrograms = [
      { id: 'p1', title: 'Safety Training', description: 'Workplace safety basics', duration_hours: 8, is_mandatory: false },
      { id: 'p2', title: 'Leadership 101', description: 'Leadership fundamentals', duration_hours: 16, is_mandatory: true },
    ];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.getByText('Safety Training')).toBeInTheDocument();
    expect(screen.getByText('Leadership 101')).toBeInTheDocument();
  });

  it('shows "Mandatory" badge for mandatory programs', () => {
    mockPrograms = [
      { id: 'p1', title: 'Required Course', description: 'Must take', duration_hours: 4, is_mandatory: true },
    ];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.getByText('Mandatory')).toBeInTheDocument();
  });

  it('shows "Enrolled" badge instead of Enroll button for enrolled programs', () => {
    mockPrograms = [
      { id: 'p1', title: 'Course A', description: 'Desc', duration_hours: 4, is_mandatory: false },
    ];
    mockEnrollments = [{ id: 'e1', program_id: 'p1', status: 'enrolled', program: { title: 'Course A', category: 'General' } }];
    render(<Training />, { wrapper });
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    // No "Enroll" button for already-enrolled program
    expect(screen.queryByRole('button', { name: /^enroll$/i })).not.toBeInTheDocument();
  });

  it('shows "Enroll" button for programs not enrolled', () => {
    mockPrograms = [
      { id: 'p1', title: 'New Course', description: 'Fresh', duration_hours: 2, is_mandatory: false },
    ];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.getByRole('button', { name: /enroll/i })).toBeInTheDocument();
  });

  it('shows enrollment section when user has enrollments', () => {
    mockPrograms = [];
    mockEnrollments = [
      { id: 'e1', program_id: 'p1', status: 'enrolled', program: { title: 'Enrolled Course', category: 'Tech' } },
    ];
    render(<Training />, { wrapper });
    expect(screen.getByText('My Enrollments')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Course')).toBeInTheDocument();
  });

  it('hides enrollment section when user has no enrollments', () => {
    mockPrograms = [];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.queryByText('My Enrollments')).not.toBeInTheDocument();
  });

  it('shows program duration in hours', () => {
    mockPrograms = [
      { id: 'p1', title: 'Quick Course', description: 'Fast', duration_hours: 4, is_mandatory: false },
    ];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.getByText(/4 hours/i)).toBeInTheDocument();
  });

  it('shows program count badge', () => {
    mockPrograms = [
      { id: 'p1', title: 'A', description: 'A', duration_hours: 1, is_mandatory: false },
      { id: 'p2', title: 'B', description: 'B', duration_hours: 2, is_mandatory: false },
    ];
    mockEnrollments = [];
    render(<Training />, { wrapper });
    expect(screen.getByText('2 programs')).toBeInTheDocument();
  });
});
