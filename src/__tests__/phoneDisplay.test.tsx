import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isPaidSubscriber: false }),
}));

import MaskedPhone from '@/components/common/MaskedPhone';
import ProtectedContact from '@/components/common/ProtectedContact';

const wrap = (node: React.ReactElement) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('ProtectedContact', () => {
  it('shows nothing when no number is stored', () => {
    const { container } = wrap(<ProtectedContact phone={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('never shows the digits of a stored number to someone who may not see it', () => {
    const { container } = wrap(<ProtectedContact phone="+91 98765 43210" />);
    expect(container.textContent).not.toMatch(/98765|43210/);
  });
});

describe('MaskedPhone', () => {
  it('says the number is not available instead of making one up from the country', () => {
    wrap(<MaskedPhone phone={null} country="UAE" />);
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('hides the digits of a stored number from a visitor who is not signed in', () => {
    const { container } = wrap(<MaskedPhone phone="+971 4 398 5210" country="UAE" />);
    expect(container.textContent).not.toMatch(/398|5210/);
    expect(screen.getByText(/Login to reveal/)).toBeInTheDocument();
  });
});
