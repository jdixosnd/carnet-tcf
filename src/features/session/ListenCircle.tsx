import { LoaderCircle, Play } from 'lucide-react';
import { useAudioState } from '../../lib/audio/player';
import { cn } from '../../lib/cn';

/** Big listening play button. `filled` = 132 px accent disc with a pulsing ring; else 96 px outline. */
export function ListenCircle({ wordIdx, onPlay, filled }: { wordIdx: number; onPlay(): void; filled: boolean }) {
  const a = useAudioState();
  const mine = a.key === `w${wordIdx}`;
  const playing = mine && a.status === 'playing';
  const loading = mine && a.status === 'loading';
  const size = filled ? 132 : 96;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {filled && (
        <span aria-hidden className={cn('absolute -inset-3 rounded-full bg-accent-soft',
          playing && 'animate-[ring-pulse_900ms_ease-in-out_infinite_alternate]')} />
      )}
      <button type="button" onClick={onPlay} aria-label="Play the word again"
        className={cn('press relative grid h-full w-full place-items-center rounded-full',
          filled ? 'bg-accent text-on-accent' : 'border-2 border-accent text-accent hover:bg-accent-soft')}>
        {loading ? <LoaderCircle size={filled ? 44 : 32} strokeWidth={1.75} className="animate-spin" />
          : <Play size={filled ? 44 : 32} strokeWidth={1.75} fill="currentColor" className="ml-1.5" />}
      </button>
    </div>
  );
}
