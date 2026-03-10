import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { CommandPalette } from '@/components/layout/CommandPalette';

vi.mock('@/components/layout/useCommandPaletteActions', () => ({
  useCommandPaletteActions: () => [],
}));

describe('CommandPalette', () => {
  it('labels the mobile trigger for assistive technology', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Open command palette/i })).toBeInTheDocument();
  });
});
