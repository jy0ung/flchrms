import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import NotFound from '@/pages/NotFound';

describe('NotFound page', () => {
  const renderNotFound = (path = '/some-missing-page') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <NotFound />
      </MemoryRouter>,
    );

  it('renders 404 heading', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders "Page not found" message', () => {
    renderNotFound();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders a link back to home', () => {
    renderNotFound();
    const link = screen.getByRole('link', { name: /return to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('logs 404 error to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderNotFound('/bad-route');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('404'),
      expect.any(String),
    );
    spy.mockRestore();
  });
});
