import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { synthWords } from '../../test/fixtures';

const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
beforeEach(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words: synthWords(), audio }); });

test('defaults are Steady, A1 and a 19:00 reminder', () => {
  render(<MemoryRouter><WelcomePage /></MemoryRouter>);
  expect(screen.getByRole('radio', { name: /15 Steady/ })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'A1' })).toHaveAttribute('aria-checked', 'true');
});

test('Start learning saves the choices; a starting level selects it and the levels above', () => {
  render(<MemoryRouter><WelcomePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: /25 Exam soon/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'B1' }));
  fireEvent.click(screen.getByRole('switch', { name: /remind/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(useCarnet.getState().settings).toMatchObject({
    newPerDay: 25, levels: ['B1', 'B2', 'C1', 'C2'], reminderEnabled: false, onboarded: true,
  });
});

test('starting from A1 means all levels', () => {
  render(<MemoryRouter><WelcomePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(useCarnet.getState().settings.levels).toEqual([]);
});
