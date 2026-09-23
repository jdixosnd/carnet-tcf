import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { useHotkeys } from './useHotkeys';

function Probe({ map }: { map: Record<string, (e: KeyboardEvent) => void> }) {
  useHotkeys(map);
  return <input aria-label="field" />;
}

test('keys fire on the page', () => {
  const one = vi.fn();
  render(<Probe map={{ '1': one }} />);
  fireEvent.keyDown(document.body, { key: '1' });
  expect(one).toHaveBeenCalledTimes(1);
});

test('typing in an input is ignored except Enter and Escape', () => {
  const one = vi.fn(), enter = vi.fn(), esc = vi.fn();
  const { getByLabelText } = render(<Probe map={{ '1': one, Enter: enter, Escape: esc }} />);
  const input = getByLabelText('field');
  fireEvent.keyDown(input, { key: '1' });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(one).not.toHaveBeenCalled();
  expect(enter).toHaveBeenCalledTimes(1);
  expect(esc).toHaveBeenCalledTimes(1);
});

test('modified keys are ignored unless mapped with Ctrl+', () => {
  const r = vi.fn(), k = vi.fn();
  render(<Probe map={{ r, 'Ctrl+k': k }} />);
  fireEvent.keyDown(document.body, { key: 'r', ctrlKey: true });
  fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
  expect(r).not.toHaveBeenCalled();
  expect(k).toHaveBeenCalledTimes(1);
});

test('space maps as "Space"', () => {
  const sp = vi.fn();
  render(<Probe map={{ Space: sp }} />);
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(sp).toHaveBeenCalledTimes(1);
});
