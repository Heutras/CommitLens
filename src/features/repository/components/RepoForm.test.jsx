import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoForm } from './RepoForm.jsx';

describe('RepoForm', () => {
  it('submits a parsed repository from a pasted GitHub URL', async () => {
    const onAnalyze = vi.fn();
    render(<RepoForm onAnalyze={onAnalyze} />);
    await userEvent.type(
      screen.getByLabelText('GitHub repository'),
      'https://github.com/vitejs/vite{Enter}',
    );
    expect(onAnalyze).toHaveBeenCalledWith({
      owner: 'vitejs',
      repo: 'vite',
      fullName: 'vitejs/vite',
    });
  });

  it('shows an accessible error and does not submit invalid input', async () => {
    const onAnalyze = vi.fn();
    render(<RepoForm onAnalyze={onAnalyze} />);
    const input = screen.getByLabelText('GitHub repository');
    await userEvent.type(input, 'not-a-repo');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(onAnalyze).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/owner\/repository/);
    expect(screen.getByRole('alert')).toHaveTextContent(/owner\/repository/);
    expect(input).toHaveFocus();
  });

  it('clears the error as soon as the user edits the input', async () => {
    render(<RepoForm onAnalyze={vi.fn()} />);
    const input = screen.getByLabelText('GitHub repository');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(input, 'a');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});
