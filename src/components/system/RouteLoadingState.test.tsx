import { render, screen } from '@testing-library/react';

import { RouteLoadingState } from './RouteLoadingState';

describe('RouteLoadingState', () => {
  it('renders route-loading copy inline by default', () => {
    render(
      <RouteLoadingState
        title="Loading governance hub"
        description="Checking available governance actions."
      />,
    );

    expect(screen.getByText('Loading governance hub')).toBeInTheDocument();
    expect(screen.getByText('Checking available governance actions.')).toBeInTheDocument();
  });
});
