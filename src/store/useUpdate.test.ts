import { vi } from 'vitest';
import { useUpdate, noteLines, type DownloadEvent, type PendingUpdate, type UpdaterApi } from './useUpdate';
import { useCarnet } from './useCarnet';
import { memoryRepo } from '../repo/memoryRepo';
import { synthWords } from '../test/fixtures';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
import { toast } from 'sonner';

const audio = { w: { files: [], start: [], len: [] }, s: { files: [], start: [], len: [] }, ws: [] };
const u = () => useUpdate.getState();

function fake(version: string | null) {
  const calls: string[] = [];
  const update: PendingUpdate = {
    version: version ?? '',
    body: '## What\'s new\n- Words: every word in one list\n- Export to CSV\n',
    async download(on?: (e: DownloadEvent) => void) {
      calls.push('download');
      on?.({ event: 'Started', data: { contentLength: 4_000_000 } });
      on?.({ event: 'Progress', data: { chunkLength: 1_000_000 } });
      on?.({ event: 'Finished' });
    },
    async install() { calls.push('install'); },
  };
  const api: UpdaterApi = { check: async () => (version ? update : null), relaunch: async () => { calls.push('relaunch'); } };
  u().setApi(api);
  return calls;
}

beforeEach(async () => { await useCarnet.getState().init({ repo: memoryRepo(null), words: synthWords(), audio }); });
afterEach(() => vi.clearAllMocks());

test('release notes become bullets', () => {
  expect(noteLines('## New\n- One\n* Two\n\nsee the site')).toEqual(['One', 'Two']);
  expect(noteLines('Just a line\nAnother')).toEqual(['Just a line', 'Another']);
  expect(noteLines(undefined)).toEqual([]);
});

test('with automatic updates on, it downloads silently and offers a restart', async () => {
  const calls = fake('1.6.0');
  await u().check();
  expect(calls).toEqual(['download']);
  expect(u()).toMatchObject({ status: 'ready', open: true, version: '1.6.0', size: 4_000_000, notes: ['Words: every word in one list', 'Export to CSV'] });
  await u().install();
  expect(calls).toEqual(['download', 'install', 'relaunch']);
});

test('with automatic updates off, it asks first; Later hides it until the next launch', async () => {
  useCarnet.getState().setSetting('autoUpdate', false);
  const calls = fake('1.6.0');
  await u().check();
  expect(calls).toEqual([]);
  expect(u()).toMatchObject({ status: 'available', open: true });
  u().later();
  expect(u().open).toBe(false);
  await u().check(); // the 6-hourly check doesn't nag…
  expect(u().open).toBe(false);
  await u().check({ manual: true }); // …but Check now shows it again
  expect(u().open).toBe(true);
  await u().install();
  expect(calls).toEqual(['download', 'install', 'relaunch']);
});

test('the database is flushed and closed before installing', async () => {
  const repo = memoryRepo(null);
  const close = vi.spyOn(repo, 'close');
  await useCarnet.getState().init({ repo, words: synthWords(), audio });
  fake('1.6.0');
  await u().check();
  await u().install();
  expect(close).toHaveBeenCalledOnce();
});

test('Check now says when there is nothing new, or when the check failed', async () => {
  fake(null);
  await u().check({ manual: true });
  expect(toast).toHaveBeenCalledWith("You're on the latest version");
  expect(u().status).toBe('idle');

  u().setApi({ check: () => Promise.reject(new Error('offline')), relaunch: async () => {} });
  await u().check(); // background: quiet
  expect(toast.error).not.toHaveBeenCalled();
  await u().check({ manual: true });
  expect(toast.error).toHaveBeenCalledWith("Couldn't check for updates");
  expect(u().status).toBe('idle');
});

test('a failed install keeps the update on offer', async () => {
  const calls = fake('1.6.0');
  await u().check();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // Fail the first install before the installer runs.
  const orig = useCarnet.getState().closeForUpdate;
  useCarnet.setState({ closeForUpdate: () => Promise.reject(new Error('locked')) });
  await u().install();
  expect(u().status).toBe('available');
  expect(toast.error).toHaveBeenCalled();
  useCarnet.setState({ closeForUpdate: orig });
  await u().install();
  expect(calls).toEqual(['download', 'download', 'install', 'relaunch']);
});
