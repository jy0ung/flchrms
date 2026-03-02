import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Admin from '@/pages/Admin';

describe('Admin page redirect', () => {
  it('redirects /admin to /admin/dashboard', () => {
    let navigatedTo = '';

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={<div data-testid="admin-dashboard">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // The Admin component is a redirect — it should navigate to /admin/dashboard
    const dashboard = document.querySelector('[data-testid="admin-dashboard"]');
    expect(dashboard).toBeTruthy();
  });
});
