import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import {
  InteractionModeProvider,
  InteractionModeToggle,
  useInteractionMode,
} from '@/components/system';

function ModeValue() {
  const { mode } = useInteractionMode();
  return <div data-testid="mode-value">{mode}</div>;
}

describe('InteractionModeToggle', () => {
  it('toggles a single custom mode as a button', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <InteractionModeProvider>
          <InteractionModeToggle
            modes={['customize']}
            includeView={false}
            singleModeLabels={{
              activate: 'Customize Dashboard',
              deactivate: 'Done Editing',
            }}
          />
          <ModeValue />
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');

    fireEvent.click(screen.getByRole('button', { name: /Customize Dashboard/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('customize');

    fireEvent.click(screen.getByRole('button', { name: /Done Editing/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');
  });

  it('switches among segmented modes', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <InteractionModeProvider>
          <InteractionModeToggle modes={['manage', 'bulk']} includeView />
          <ModeValue />
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mode-value')).toHaveTextContent('view');

    fireEvent.click(screen.getByRole('radio', { name: /Set mode to Manage/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('manage');

    fireEvent.click(screen.getByRole('radio', { name: /Set mode to Bulk/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('bulk');
  });

  it('renders inline segmented layout with horizontal affordance and remains operable', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <InteractionModeProvider>
          <InteractionModeToggle modes={['view', 'manage', 'bulk', 'customize']} includeView layout="inline" />
          <ModeValue />
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    const group = screen.getByLabelText('Interaction mode');
    expect(group).toHaveClass('overflow-x-auto');
    expect(group).not.toHaveClass('grid');

    fireEvent.click(screen.getByRole('radio', { name: /Set mode to Customize/i }));
    expect(screen.getByTestId('mode-value')).toHaveTextContent('customize');
  });
});
