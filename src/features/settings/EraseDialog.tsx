import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { useCarnet } from '../../store/useCarnet';

export function EraseDialog({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setText(''); }, [open]);
  const ok = text.trim().toLowerCase() === 'erase';
  const erase = async () => {
    setBusy(true);
    try {
      await useCarnet.getState().erase();
      toast('Progress erased');
      onOpenChange(false);
    } catch { toast.error("Couldn't erase your progress"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Erase all progress?">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[15px] leading-normal text-ink-2">
          Every word goes back to <i>not started</i> and your history and streak are removed. Your settings stay. Type <b className="text-ink">erase</b> to confirm.
        </p>
        <input value={text} onChange={e => setText(e.target.value)} aria-label="Type erase to confirm" autoComplete="off" spellCheck={false}
          className="rounded-[10px] border border-line-strong bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-forgot-solid" />
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Keep my progress</Button>
          <Button variant="danger" className="px-4 py-3 text-[15px] font-bold" disabled={!ok || busy} onClick={() => void erase()}>Erase all progress</Button>
        </div>
      </div>
    </Dialog>
  );
}
