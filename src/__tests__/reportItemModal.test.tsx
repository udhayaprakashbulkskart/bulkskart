import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  return {
    insert,
    from: vi.fn(() => ({ insert })),
    toast: { success: vi.fn(), error: vi.fn() },
    auth: { user: { id: 'user-1', email: 'buyer@example.com' } as { id: string; email: string } | null },
  };
});
const { insert, from, toast } = mocks;

vi.mock('@/db/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.auth.user }) }));
vi.mock('sonner', () => ({ toast: mocks.toast }));

// The real select is a Radix popover, which needs a browser; a native select keeps the test about the form.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select aria-label="reason" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">-</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import ReportItemModal from '@/components/common/ReportItemModal';

const open = () =>
  render(<ReportItemModal open onOpenChange={() => {}} targetType="product" targetId="prod-9" targetTitle="Steel pipes" />);

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('reason'), { target: { value: 'fraud' } });
  fireEvent.change(screen.getByPlaceholderText(/describe why this listing violates/i), {
    target: { value: 'The seller asked me to pay outside the platform.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
}

beforeEach(() => {
  insert.mockReset();
  from.mockClear();
  toast.success.mockReset();
  toast.error.mockReset();
  localStorage.clear();
  mocks.auth.user = { id: 'user-1', email: 'buyer@example.com' };
});

describe('ReportItemModal', () => {
  it('writes the report to the reports table, not to the visitor\'s own browser', async () => {
    insert.mockResolvedValue({ error: null });
    open();
    fillAndSubmit();

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(from).toHaveBeenCalledWith('reports');
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({ reporter_id: 'user-1', reported_product_id: 'prod-9', reported_company_id: null });
    expect(row.description).toContain('The seller asked me to pay outside the platform.');
    expect(localStorage.getItem('bs_reports')).toBeNull();

    // The reference shown is the start of the saved row's id, so support can find it.
    const ref = await screen.findByText(/^[0-9A-F]{8}$/);
    expect(row.id.slice(0, 8).toUpperCase()).toBe(ref.textContent);
  });

  it('does not claim success when the report could not be saved', async () => {
    insert.mockResolvedValue({ error: { message: 'permission denied' } });
    open();
    fillAndSubmit();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText('Report Received')).toBeNull();
  });

  it('asks a visitor who is not signed in to sign in, and saves nothing', async () => {
    mocks.auth.user = null;
    open();
    fillAndSubmit();

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
    expect(insert).not.toHaveBeenCalled();
  });
});
