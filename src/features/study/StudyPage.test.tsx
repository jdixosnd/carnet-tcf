import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudyPage } from './StudyPage';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { synthWords } from '../../test/fixtures';

const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };

test('words added to today can still be studied when the filters match nothing', async () => {
  await useCarnet.getState().init({ repo: memoryRepo(null), words: synthWords(), audio });
  useCarnet.getState().setSetting('tests', []);
  useCarnet.getState().addToToday(4);
  render(<MemoryRouter><StudyPage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /Start session · 1 card/ })).toBeEnabled();
  expect(screen.getByText('1 card waiting today')).toBeInTheDocument();
});
