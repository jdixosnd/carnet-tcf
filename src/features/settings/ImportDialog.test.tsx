import fs from 'node:fs';
import path from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ImportDialog } from './ImportDialog';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { synthWords } from '../../test/fixtures';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const code = fs.readFileSync(path.resolve(import.meta.dirname, '../../../tests/fixtures/web-backup.txt'), 'utf8');
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
beforeEach(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words: synthWords(), audio }); });

test('a valid code shows what it holds, then replaces progress on confirm', async () => {
  const onOpenChange = vi.fn();
  render(<ImportDialog open onOpenChange={onOpenChange} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Check code' }));
  expect(screen.getByText(/3 words · 1 day of history · 3 reviews/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Replace my progress' }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(Object.keys(useCarnet.getState().cards)).toEqual(['permettre', 'fois', 'parler']);
});

test('an invalid code shows an inline error and changes nothing', () => {
  render(<ImportDialog open onOpenChange={vi.fn()} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check code' }));
  expect(screen.getByText("That code isn't a valid Carnet backup")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Replace my progress' })).not.toBeInTheDocument();
});

test('a backup read from a file skips straight to the preview', () => {
  render(<ImportDialog open onOpenChange={vi.fn()} preloaded={{ cards: {}, hist: {}, settings: {} }} />);
  expect(screen.getByText(/0 words/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
