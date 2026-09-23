import { render, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

const toggleMaximize = vi.fn();
vi.mock('./win', () => ({ toggleMaximize: () => toggleMaximize(), minimize: vi.fn(), closeWindow: vi.fn() }));
import { TitleBar } from './TitleBar';

test('double-click is left to Tauri\'s drag region (no second toggle)', () => {
  render(<TitleBar />);
  fireEvent.doubleClick(screen.getByText('Carnet TCF'));
  expect(toggleMaximize).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Maximise' }));
  expect(toggleMaximize).toHaveBeenCalledTimes(1);
});
