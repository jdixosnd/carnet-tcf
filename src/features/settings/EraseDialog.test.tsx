import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EraseDialog } from './EraseDialog';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { synthWords } from '../../test/fixtures';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };

test('erasing requires typing "erase"', async () => {
  await useCarnet.getState().init({ repo: memoryRepo(null), words: synthWords(), audio });
  useCarnet.getState().rate(0, 'knew');
  const onOpenChange = vi.fn();
  render(<EraseDialog open onOpenChange={onOpenChange} />);
  const btn = screen.getByRole('button', { name: 'Erase all progress' });
  expect(btn).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Erase ' } });
  expect(btn).toBeEnabled();
  fireEvent.click(btn);
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(useCarnet.getState().cards).toEqual({});
});
