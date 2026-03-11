import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppPageContainer } from './AppPageContainer';

describe('AppPageContainer', () => {
  it('supports aligned frame padding and max-width constraints', () => {
    const { container } = render(
      <AppPageContainer spacing="none" maxWidth="7xl" framePadding="shell">
        <div>content</div>
      </AppPageContainer>,
    );

    expect(container.firstChild).toHaveClass('max-w-7xl');
    expect(container.firstChild).toHaveClass('mx-auto');
    expect(container.firstChild).toHaveClass('px-4');
    expect(container.firstChild).toHaveClass('md:px-6');
    expect(container.firstChild).toHaveClass('lg:px-8');
  });
});
