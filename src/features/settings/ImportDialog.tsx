import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { backupCounts, decodeBackup, BackupError, type BackupData } from '../../lib/backup';
import { plural } from '../../lib/format';
import { useCarnet } from '../../store/useCarnet';

/** Paste a backup code (or confirm a backup read from a file), preview it, then replace progress. */
export function ImportDialog({ open, onOpenChange, preloaded, onDone }: {
  open: boolean; onOpenChange(o: boolean): void; preloaded?: BackupData | null; onDone?(): void;
}) {
  const [code, setCode] = useState('');
  const [data, setData] = useState<BackupData | null>(preloaded ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setData(preloaded ?? null); setCode(''); setError(''); } }, [open, preloaded]);

  const check = () => {
    try { setData(decodeBackup(code)); setError(''); }
    catch (e) { setError(e instanceof BackupError ? e.message : "That code isn't a valid Carnet backup"); }
  };
  const confirm = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await useCarnet.getState().importBackup(data);
      toast(`Restored ${plural(Object.keys(data.cards).length, 'word')}`);
      onOpenChange(false);
      onDone?.();
    } catch {
      setError("Couldn't restore this backup. Check Progress to see what is saved, then try again.");
    } finally { setBusy(false); }
  };

  const c = data && backupCounts(data);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} eyebrow="Restore" title={data ? 'Replace your progress?' : 'Paste a backup code'}>
      {!data ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[15px] leading-normal text-ink-2">Codes from the web version of Carnet work too.</p>
          <textarea value={code} onChange={e => { setCode(e.target.value); setError(''); }} rows={5} spellCheck={false}
            aria-label="Backup code" placeholder="Paste the code here"
            className="w-full resize-none rounded-[10px] border border-line-strong bg-paper p-3 font-mono text-[13px] text-ink outline-none focus:border-accent" />
          {error && <p role="alert" className="m-0 text-[14px] text-forgot-text">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="dark" disabled={!code.trim()} onClick={check}>Check code</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[16px]">
            This backup holds <b>{plural(c!.words, 'word')} · {plural(c!.days, 'day')} of history · {plural(c!.reviews, 'review')}</b>.
          </p>
          <p className="m-0 text-[15px] leading-normal text-ink-2">It replaces all progress saved on this PC. This can't be undone, so save a backup first if you might want it back.</p>
          {error && <p role="alert" className="m-0 text-[14px] text-forgot-text">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={() => void confirm()}>Replace my progress</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
