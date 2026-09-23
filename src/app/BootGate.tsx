import { useEffect, type ReactNode } from 'react';
import { useCarnet } from '../store/useCarnet';
import { Button } from '../components/Button';
import { closeWindow } from './win';
import { isTauri } from '../repo/env';

async function openDataFolder() {
  if (!isTauri()) return;
  const [{ openPath }, { appConfigDir }] = await Promise.all([import('@tauri-apps/plugin-opener'), import('@tauri-apps/api/path')]);
  await openPath(await appConfigDir());
}

const MESSAGES = {
  db: 'Your progress database could not be opened or updated. Nothing has been deleted. Open the data folder to make a copy of carnet.db, then restart the app.',
  words: 'The word list or audio index is missing. Reinstall Carnet TCF to restore it — your progress is kept.',
};

export function BootGate({ children }: { children: ReactNode }) {
  const status = useCarnet(s => s.status);
  const error = useCarnet(s => s.error);
  useEffect(() => { void useCarnet.getState().init(); }, []);

  if (status === 'loading') return <div className="flex-1 bg-paper" aria-busy="true" />;
  if (status === 'error') {
    return (
      <div role="alert" className="flex flex-1 items-center justify-center bg-paper p-10">
        <div className="flex max-w-[520px] flex-col gap-5">
          <h1 className="m-0 font-serif text-[40px] font-normal leading-[1.1]">Carnet TCF couldn't open your data</h1>
          <p className="m-0 text-[16px] leading-normal text-ink-2">{MESSAGES[error ?? 'db']}</p>
          <div className="flex gap-3">
            {error === 'db' && isTauri() && <Button variant="primary" onClick={() => void openDataFolder()}>Open data folder</Button>}
            <Button variant="secondary" onClick={() => void closeWindow()}>Quit</Button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
