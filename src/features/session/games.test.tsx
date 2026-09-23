import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import { MultipleChoice } from './MultipleChoice';
import { ListenChoose } from './ListenChoose';
import { ListenType } from './ListenType';
import { useCarnet } from '../../store/useCarnet';
import { memoryRepo } from '../../repo/memoryRepo';
import { realWords, byFr } from '../../test/fixtures';

const words = realWords();
const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
beforeAll(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words, audio }); });

const facture = byFr(words, 'facture');
const reveil = byFr(words, 'réveil');

function optionKeys() {
  const opts = within(screen.getByRole('group', { name: /answers/i })).getAllByRole('button');
  return opts;
}

test('multiple choice: a wrong pick is marked, the answer shown, Enter continues as Forgot', () => {
  const onResult = vi.fn();
  render(<MultipleChoice word={facture} dir="fr-en" practice={false} retry={false} onResult={onResult} />);
  expect(screen.getByText(/French → English · B1|French → English · [ABC]\d/)).toBeInTheDocument();
  const opts = optionKeys();
  expect(opts).toHaveLength(4);
  const wrongIdx = opts.findIndex(b => !b.textContent!.includes(facture.en));
  fireEvent.keyDown(window, { key: String(wrongIdx + 1) });
  expect(opts[wrongIdx]).toHaveAttribute('data-state', 'wrong');
  expect(opts.find(b => b.textContent!.includes(facture.en))).toHaveAttribute('data-state', 'correct');
  expect(screen.getByText(/Not quite/)).toBeInTheDocument();
  expect(onResult).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(onResult).toHaveBeenCalledWith('forgot');
});

test('multiple choice EN → FR: a right pick continues as Knew it', () => {
  const onResult = vi.fn();
  render(<MultipleChoice word={facture} dir="en-fr" practice={false} retry={false} onResult={onResult} />);
  const opts = optionKeys();
  const right = opts.findIndex(b => b.textContent!.includes('la facture'));
  fireEvent.click(opts[right]);
  expect(screen.getByText(/^Correct/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  expect(onResult).toHaveBeenCalledWith('knew');
});

test('listening choose: options are French and keys pick', () => {
  const onResult = vi.fn();
  render(<ListenChoose word={reveil} practice={false} retry={false} onResult={onResult} />);
  expect(screen.getByText('What did you hear?')).toBeInTheDocument();
  const opts = optionKeys();
  const right = opts.findIndex(b => b.textContent!.includes('réveil'));
  fireEvent.keyDown(window, { key: String(right + 1) });
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(onResult).toHaveBeenCalledWith('knew');
});

test('listening type: a missing accent counts, with a reminder', () => {
  const onResult = vi.fn();
  render(<ListenType word={reveil} practice={false} retry={false} onResult={onResult} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'le reveil' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByText('✓ Correct')).toBeInTheDocument();
  expect(screen.getByText(/Mind the accent/)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Enter' });
  expect(onResult).toHaveBeenCalledWith('knew');
});

test('listening type: empty input is ignored, a wrong word shows the answer', () => {
  const onResult = vi.fn();
  render(<ListenType word={reveil} practice={false} retry={false} onResult={onResult} />);
  const input = screen.getByRole('textbox');
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByText(/It was/)).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'chat' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByText(/It was:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  expect(onResult).toHaveBeenCalledWith('forgot');
});
