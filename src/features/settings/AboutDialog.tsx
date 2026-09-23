import { Dialog } from '../../components/Dialog';
import { Button } from '../../components/Button';
import { APP_VERSION, TOTAL_WORDS } from '../../data/defaults';
import { fmt } from '../../lib/format';

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} eyebrow={`Version ${APP_VERSION}`} title="About Carnet TCF">
      <div className="flex flex-col gap-3 text-[15px] leading-normal text-ink-2">
        <p className="m-0">Flashcards for the {fmt(TOTAL_WORDS)} French words heard in 40 TCF Canada <i lang="fr">compréhension orale</i> practice tests.</p>
        <p className="m-0"><b className="text-ink">Voice.</b> Recordings are synthetic, made with Piper and the voice <span className="font-mono text-[13px]">fr_FR-siwis-medium</span>, trained on the SIWIS dataset (CC BY 4.0).</p>
        <p className="m-0"><b className="text-ink">Words.</b> The transcripts come from formation-tcfcanada.com and are for personal study. English meanings were written with Claude and spot-checked.</p>
        <p className="m-0"><b className="text-ink">Fonts.</b> Atkinson Hyperlegible, Newsreader and Playwrite FR Moderne (SIL Open Font License).</p>
        <div className="mt-2 flex justify-end"><Button variant="dark" onClick={() => onOpenChange(false)}>Close</Button></div>
      </div>
    </Dialog>
  );
}
