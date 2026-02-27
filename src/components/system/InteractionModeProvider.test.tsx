import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import {
  InteractionModeProvider,
  useInteractionMode,
} from '@/components/system';

function ModeHarness({ nextRoute }: { nextRoute?: string }) {
  const navigate = useNavigate();
  const { mode, setMode, resetMode } = useInteractionMode();

  return (
    <div>
      <div data-testid="mode-value">{mode}</div>
      <button type="button" onClick={() => setMode('customize')}>
        Set Customize
      </button>
      <button type="button" onClick={() => setMode('manage')}>
        Set Manage
      </button>
      <button type="button" onClick={resetMode}>
        Reset Mode
      </button>
      {nextRoute ? (
        <button type="button" onClick={() => navigate(nextRoute)}>
          Navigate
        </button>
      ) : null}
      <div role="dialog" aria-label="Test Dialog">
        <button type="button">Dialog Action</button>
      </div>
    </div>
  );
}

describe('InteractionModeProvider', () => {
  it('resets mode when route changes', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <InteractionModeProvider>
          <Routes>
            <Route path="/dashboard" element={<ModeHarness nextRoute="/admin" />} />
            <Route path="/admin" element={<ModeHarness />} />
          </Routes>
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');

    fireEvent.click(screen.getByRole('button', { name: /Set Customize/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('customize');

    fireEvent.click(screen.getByRole('button', { name: /Navigate/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');
  });

  it('resets mode on Escape outside dialog', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <InteractionModeProvider>
          <Routes>
            <Route path="/dashboard" element={<ModeHarness />} />
          </Routes>
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Set Manage/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('manage');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');
  });

  it('does not reset mode on Escape when event target is in dialog', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <InteractionModeProvider>
          <Routes>
            <Route path="/dashboard" element={<ModeHarness />} />
          </Routes>
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Set Manage/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('manage');

    const dialog = screen.getByRole('dialog', { name: /Test Dialog/i });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByTestId('mode-value')).toHaveTextContent('manage');
  });
});

