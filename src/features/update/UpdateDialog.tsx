import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { useUpdate } from '../../store/useUpdate';

const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

/** Handoff screen 11: "Update available" with notes, size and Later / Install and restart. */
export function UpdateDialog() {
  const u = useUpdate();
  const busy = u.status === 'downloading' || u.status === 'installing';
  const pct = u.size ? Math.min(100, Math.round((u.received / u.size) * 100)) : 0;
  const meta = [u.size ? mb(u.size) : null, 'signed', 'your progress is kept'].filter(Boolean).join(' · ');
  return (
    <Dialog open={u.open} onOpenChange={o => { if (!o && !busy) u.later(); }}
      eyebrow={u.status === 'ready' ? 'Update ready' : 'Update available'} title={`Carnet TCF ${u.version}`}>
      {u.notes.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px] text-ink-2">
          {u.notes.map((n, k) => <li key={k}>· {n}</li>)}
        </ul>
      )}
      <p className="m-0 mt-4 text-[13px] text-ink-3">{meta}</p>
      {busy && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-label="Downloading the update"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.status === 'installing' ? 100 : pct}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${u.status === 'installing' ? 100 : pct}%` }} />
          </div>
          <span className="text-[13px] text-ink-3">
            {u.status === 'installing' ? 'Installing… Carnet will restart.' : u.size ? `Downloading… ${pct}%` : 'Downloading…'}
          </span>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" className="px-[18px] py-[11px] text-[15px]" disabled={busy} onClick={u.later}>Later</Button>
        <Button variant="primary" className="px-5 py-3 text-[15px]" disabled={busy} onClick={() => void u.install()}>
          {u.status === 'ready' ? 'Restart to update' : 'Install and restart'}
        </Button>
      </div>
    </Dialog>
  );
}
