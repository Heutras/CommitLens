import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { examples } from '../../../data/snapshots/index.js';
import { ExamplePicker } from './ExamplePicker.jsx';

describe('ExamplePicker', () => {
  it('lists every example with its category and marks the selected one', () => {
    render(<ExamplePicker examples={examples} selected="vitejs/vite" onSelect={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Examples' });
    const buttons = group.querySelectorAll('button');
    expect([...buttons].map((button) => button.textContent)).toEqual([
      'vitejs/viteFrontend tooling',
      'vercel/next.jsWeb framework',
      'microsoft/vscodeDeveloper tools',
      'golang/goProgramming language',
      'torvalds/linuxOperating system',
    ]);
    expect(screen.getByRole('button', { name: /vitejs\/vite/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /golang\/go/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks nothing for a custom repository', () => {
    render(<ExamplePicker examples={examples} selected="acme/rocket" onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  });

  it('reports the chosen example', async () => {
    const onSelect = vi.fn();
    render(<ExamplePicker examples={examples} selected="vitejs/vite" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /torvalds\/linux/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'torvalds/linux' }));
  });
});
