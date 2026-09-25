import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useCarnet } from '../../store/useCarnet';
import { useUpdate } from '../../store/useUpdate';
import { isTauri } from '../../repo/env';
import { Eyebrow } from '../../components/Card';
import { Stepper } from '../../components/Stepper';
import { Switch } from '../../components/Switch';
import { Segmented } from '../../components/Segmented';
import { Slider } from '../../components/Slider';
import { Button } from '../../components/Button';
import { Tooltip } from '../../components/Tooltip';
import { APP_VERSION } from '../../data/defaults';
import { BackupError, type BackupData } from '../../lib/backup';
import { playWord } from '../../lib/audio/player';
import { ImportDialog } from './ImportDialog';
import { EraseDialog } from './EraseDialog';
import { AboutDialog } from './AboutDialog';
import { copyBackupCode, openBackupFile, saveBackupFile } from './backupActions';
import { cn } from '../../lib/cn';

const Row = ({ label, children, last, htmlFor }: { label: string; children: ReactNode; last?: boolean; htmlFor?: string }) => (
  <div className={cn('flex items-center justify-between gap-6', !last && 'border-b border-line pb-3.5')}>
    <label htmlFor={htmlFor} className="text-[16px]">{label}</label>
    {children}
  </div>
);
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3.5" aria-label={title}><Eyebrow>{title}</Eyebrow>{children}</section>
);

export function SettingsPage() {
  const s = useCarnet(st => st.settings);
  const checking = useUpdate(u => u.status === 'checking');
  const set = useCarnet(st => st.setSetting);
  const dbPath = useCarnet(st => st.dbPath);
  const [importOpen, setImportOpen] = useState(false);
  const [preloaded, setPreloaded] = useState<BackupData | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const data = () => useCarnet.getState();

  const copy = () => copyBackupCode(data()).then(() => toast('Backup code copied'), () => toast.error("Couldn't copy to the clipboard"));
  const saveFile = () => saveBackupFile(data()).then(ok => { if (ok) toast('Backup saved'); }, () => toast.error("Couldn't save the backup file"));
  const openFile = () => openBackupFile().then(d => {
    if (!d) return;
    setPreloaded(d);
    setImportOpen(true);
  }, e => toast.error(e instanceof BackupError ? "That file isn't a valid Carnet backup" : "Couldn't read that file"));

  // A 0-based bonjour index is looked up lazily for the voice test.
  const testVoice = () => {
    const w = data().words.find(x => x.fr === 'bonjour');
    if (w) void playWord(w.i);
  };

  return (
    <div className="grid grid-cols-2 content-start gap-x-10 px-12 py-10">
      <h2 className="col-span-2 m-0 mb-6 font-serif text-[44px] font-normal leading-[1.1]">Settings</h2>
      <div className="flex flex-col gap-7">
        <Section title="Study">
          <Row label="New words per day"><Stepper label="New words per day" value={s.newPerDay} min={0} max={100} step={5} onChange={v => set('newPerDay', v)} /></Row>
          <Row label="Cards per session"><Stepper label="Cards per session" value={s.sessionSize} min={10} max={200} step={10} onChange={v => set('sessionSize', v)} /></Row>
          <Row label="Daily reminder" last htmlFor="reminder-switch">
            <div className="flex items-center gap-3">
              <input type="time" value={s.reminderTime} disabled={!s.reminderEnabled} aria-label="Reminder time"
                onChange={e => e.target.value && set('reminderTime', e.target.value)}
                className="tnum rounded-[6px] bg-transparent px-1 text-[15px] text-ink-2 outline-none disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:hidden" />
              <Switch id="reminder-switch" label="Daily reminder" checked={s.reminderEnabled} onCheckedChange={v => set('reminderEnabled', v)} />
            </div>
          </Row>
        </Section>
        <Section title="Audio">
          <Row label="Voice">
            <Segmented size="sm" label="Voice" value={s.voice} onChange={v => set('voice', v)}
              options={[{ value: 'recorded', label: 'Recorded' }, { value: 'device', label: 'Windows voice' }]} />
          </Row>
          <Row label="Reading speed" last>
            <div className="flex max-w-[220px] flex-1 items-center gap-3">
              <Slider label="Reading speed" value={s.speed} min={0.6} max={1.2} step={0.1} onChange={v => set('speed', v)} />
              <span className="tnum w-9 text-[14px]">{s.speed.toFixed(1)}×</span>
            </div>
          </Row>
          <div><Button variant="link" className="text-[14px]" onClick={testVoice}>Test the voice</Button></div>
        </Section>
        <Section title="Appearance">
          <Row label="Theme" last>
            <Segmented size="sm" label="Theme" value={s.theme} onChange={v => set('theme', v)}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
          </Row>
        </Section>
      </div>

      <div className="flex flex-col gap-7">
        <Section title="Your data">
          <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-surface px-4 py-3.5">
            <span className="text-[12px] text-ink-3">Saved at</span>
            <span className="select-text break-all font-mono text-[13px]">{dbPath}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="small" onClick={() => void saveFile()}>Save backup file…</Button>
            <Button variant="small" onClick={() => void openFile()}>Restore from file…</Button>
            <Button variant="small" onClick={() => void copy()}>Copy backup code</Button>
            <Button variant="small" onClick={() => { setPreloaded(null); setImportOpen(true); }}>Paste code</Button>
          </div>
          <span className="text-[13px] text-ink-3">Backup codes also work with the web version of Carnet.</span>
        </Section>
        <Section title="App">
          <Row label="Start with Windows" htmlFor="autostart-switch">
            <Switch id="autostart-switch" label="Start with Windows" checked={s.autostart} onCheckedChange={v => set('autostart', v)} />
          </Row>
          <Row label="Install updates automatically" htmlFor="autoupdate-switch">
            <Switch id="autoupdate-switch" label="Install updates automatically" checked={s.autoUpdate} onCheckedChange={v => set('autoUpdate', v)} />
          </Row>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[16px]">
              Version {APP_VERSION} · <button type="button" className="text-accent hover:underline" onClick={() => setAboutOpen(true)}>About</button>
            </span>
            {isTauri() ? (
              <Button variant="small" className="py-2" disabled={checking} onClick={() => void useUpdate.getState().check({ manual: true })}>
                {checking ? 'Checking…' : 'Check now'}
              </Button>
            ) : (
              <Tooltip side="left" content="Update checks work in the installed app">
                <span tabIndex={0}><Button variant="small" disabled className="py-2">Check now</Button></span>
              </Tooltip>
            )}
          </div>
        </Section>
        <div className="flex items-center justify-between gap-4 rounded-[10px] border border-forgot-border bg-danger p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-forgot-text">Erase all progress</span>
            <span className="text-[13px] text-forgot-sub">Words stay. Your boxes and history are removed.</span>
          </div>
          <Button variant="danger" className="py-2" onClick={() => setEraseOpen(true)}>Erase…</Button>
        </div>
      </div>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} preloaded={preloaded} />
      <EraseDialog open={eraseOpen} onOpenChange={setEraseOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
