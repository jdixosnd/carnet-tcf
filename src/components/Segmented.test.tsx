import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Segmented } from './Segmented';

const opts = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }];

test('clicking a segment selects it', () => {
  const onChange = vi.fn();
  render(<Segmented label="Game" value="a" options={opts} onChange={onChange} />);
  expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('radio', { name: 'Gamma' }));
  expect(onChange).toHaveBeenCalledWith('c');
});

test('arrow keys move the selection', () => {
  const onChange = vi.fn();
  render(<Segmented label="Game" value="b" options={opts} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('radio', { name: 'Beta' }), { key: 'ArrowRight' });
  expect(onChange).toHaveBeenCalledWith('c');
  fireEvent.keyDown(screen.getByRole('radio', { name: 'Beta' }), { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenCalledWith('a');
});
