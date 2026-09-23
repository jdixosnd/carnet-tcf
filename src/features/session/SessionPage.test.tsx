import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionPage } from './SessionPage';
import { useCarnet } from '../../store/useCarnet';
import { useRun } from '../../store/useRun';
import { memoryRepo } from '../../repo/memoryRepo';
import { realWords, byFr } from '../../test/fixtures';

const words = realWords();
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };

test('an answer picked but not yet continued still counts when the session is ended', async () => {
  await useCarnet.getState().init({ repo: memoryRepo(null), words, audio });
  useCarnet.getState().setSetting('game', 'mc');
  const i = byFr(words, 'facture').i;
  useRun.getState().start([i, i + 1, i + 2], { practice: false });
  render(<MemoryRouter initialEntries={['/session']}><Routes>
    <Route path="/session" element={<SessionPage />} /><Route path="/complete" element={<p>complete</p>} />
  </Routes></MemoryRouter>);
  fireEvent.keyDown(window, { key: '1' });
  fireEvent.click(screen.getByRole('button', { name: /End session/ }));
  fireEvent.click(screen.getByRole('button', { name: 'End session' }));
  const run = useRun.getState().run!;
  expect(run.right + run.wrong).toBe(1);
  expect(Object.keys(useCarnet.getState().cards)).toContain('facture');
});
