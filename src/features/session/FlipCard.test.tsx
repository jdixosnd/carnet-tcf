import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { FlipCard } from './FlipCard';
import { hydrate } from '../../data/words';

const [w] = hydrate([['attendre', 'to wait (for), to expect', 'v', '', 'B1', 186, [1, 2, 12], ['attends', 'attendez'], [['Je vous attends devant la gare.', 'attends', 12, 8]], 'attendu']]);

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

test('front shows the word; Space turns it over; 3 rates Knew it', () => {
  const onResult = vi.fn();
  render(<FlipCard word={w} card={{ b: 2, d: 1, r: 1, w: 0, f: 1, l: 1 }} practice={false} retry={false} onResult={onResult} />);
  expect(screen.getByText('attendre')).toBeInTheDocument();
  expect(screen.getByText('Review · box 2')).toBeInTheDocument();
  expect(screen.queryByText('to wait (for), to expect')).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: ' ' });
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.getByText('to wait (for), to expect')).toBeInTheDocument();
  expect(screen.getByText('1 · tomorrow')).toBeInTheDocument();
  expect(screen.getByText('2 · tomorrow')).toBeInTheDocument();
  expect(screen.getByText('3 · in 7 days')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: '3' });
  expect(onResult).toHaveBeenCalledWith('knew');
});

test('rating keys do nothing on the front', () => {
  const onResult = vi.fn();
  render(<FlipCard word={w} practice={false} retry={false} onResult={onResult} />);
  fireEvent.keyDown(window, { key: '1' });
  expect(onResult).not.toHaveBeenCalled();
  expect(screen.getByText('New word')).toBeInTheDocument();
});

test('practice rounds show no schedule', () => {
  render(<FlipCard word={w} practice retry={false} onResult={vi.fn()} />);
  act(() => { vi.advanceTimersByTime(300); });
  fireEvent.click(screen.getByRole('button', { name: /show answer/i }));
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.getByText('1 · again')).toBeInTheDocument();
  expect(screen.getByText('3 · got it')).toBeInTheDocument();
});

test('a click landing right after the card appears (double-click) does not flip it', () => {
  render(<FlipCard word={w} practice={false} retry={false} onResult={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /show answer/i }), { detail: 2 });
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.queryByText('to wait (for), to expect')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /show answer/i }), { detail: 1 });
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.getByText('to wait (for), to expect')).toBeInTheDocument();
});

test('Space on the focused button (a keyboard click) flips at once', () => {
  render(<FlipCard word={w} practice={false} retry={false} onResult={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /show answer/i }), { detail: 0 });
  act(() => { vi.advanceTimersByTime(400); });
  expect(screen.getByText('to wait (for), to expect')).toBeInTheDocument();
});
