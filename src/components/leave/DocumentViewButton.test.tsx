import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentViewButton } from '@/components/leave/DocumentViewButton';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn(),
      }),
    },
  },
}));

describe('DocumentViewButton', () => {
  it('renders an explicit label by default for scanable row actions', () => {
    render(<DocumentViewButton documentPath="user-1/doc.pdf" />);

    expect(screen.getByRole('button', { name: /View Doc/i })).toBeInTheDocument();
  });

  it('keeps an accessible name when only the icon is shown', () => {
    render(
      <DocumentViewButton
        documentPath="user-1/doc.pdf"
        showLabel={false}
        label="View supporting document"
      />,
    );

    expect(screen.getByRole('button', { name: /View supporting document/i })).toBeInTheDocument();
  });
});
