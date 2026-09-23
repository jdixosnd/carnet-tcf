import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { realWords } from '../../test/fixtures';

const words = realWords();
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
beforeEach(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words, audio }); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

const renderPage = () => render(<MemoryRouter><SearchPage /></MemoryRouter>);
const typeQuery = (q: string) => {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: q } });
  act(() => { vi.advanceTimersByTime(100); });
};

test('empty state invites a search', () => {
  renderPage();
  expect(screen.getByText('Search 4,842 words in French or English')).toBeInTheDocument();
});

test('a heard form finds the headword and says which form matched', () => {
  renderPage();
  typeQuery('allons');
  const rows = screen.getAllByRole('option');
  expect(rows[0]).toHaveTextContent('aller');
  expect(rows[0]).toHaveTextContent('matched “allons”');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('aller');
});

test('arrow keys move the selection and the detail follows', () => {
  renderPage();
  typeQuery('voi');
  const second = screen.getAllByRole('option')[1].textContent!;
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'ArrowDown' });
  expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  expect(second).toContain(screen.getByRole('heading', { level: 2 }).textContent!);
});

test('no results', () => {
  renderPage();
  typeQuery('zzzqq');
  expect(screen.getByText('No word matches “zzzqq”')).toBeInTheDocument();
});

test('add to today puts the word in extra_today', () => {
  renderPage();
  typeQuery('voiture');
  fireEvent.click(screen.getByRole('button', { name: "Add to today's reviews" }));
  expect(useCarnet.getState().extraToday).toHaveProperty('voiture');
  expect(screen.getByRole('button', { name: /In today's reviews/ })).toBeDisabled();
});
