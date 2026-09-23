import { LoaderCircle, Play } from 'lucide-react';
import { cn } from '../lib/cn';
import { useAudioState } from '../lib/audio/player';

/** Round ▶ icon button that shows a spinner while its clip loads. `audioKey` is "w12" / "s12". */
export function PlayButton({ onPlay, audioKey, label, size = 36, className }: {
  onPlay(): void; audioKey: string; label: string; size?: number; className?: string;
}) {
  const a = useAudioState();
  const loading = a.key === audioKey && a.status === 'loading';
  return (
    <button type="button" aria-label={label} title={label} onClick={onPlay} style={{ width: size, height: size }}
      className={cn('press grid shrink-0 place-items-center rounded-full border border-line-strong text-accent hover:bg-hover', className)}>
      {loading ? <LoaderCircle size={size * 0.45} strokeWidth={1.75} className="animate-spin" />
        : <Play size={size * 0.42} strokeWidth={1.75} fill="currentColor" className="ml-0.5" />}
    </button>
  );
}
