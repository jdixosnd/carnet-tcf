import { Minus, Square, X } from 'lucide-react';
import { closeWindow, minimize, toggleMaximize } from './win';

/** Custom 36 px title bar (window decorations are off). */
export function TitleBar() {
  const btn = 'grid h-full w-[46px] place-items-center text-ink-2 transition-colors duration-150';
  return (
    <header data-tauri-drag-region onDoubleClick={() => void toggleMaximize()}
      className="relative z-30 flex h-9 shrink-0 items-center justify-between border-b border-line bg-chrome">
      <div data-tauri-drag-region className="flex items-center gap-2.5 pl-3.5 text-[12px] text-ink-3">
        <span data-tauri-drag-region className="h-3.5 w-3.5 rounded-[3px] bg-accent" />
        <span data-tauri-drag-region>Carnet TCF</span>
      </div>
      <div className="flex h-full" onDoubleClick={e => e.stopPropagation()}>
        <button type="button" aria-label="Minimise" className={`${btn} hover:bg-win-hover`} onClick={() => void minimize()}>
          <Minus size={16} strokeWidth={1.75} />
        </button>
        <button type="button" aria-label="Maximise" className={`${btn} hover:bg-win-hover`} onClick={() => void toggleMaximize()}>
          <Square size={13} strokeWidth={1.75} />
        </button>
        <button type="button" aria-label="Close" className={`${btn} hover:bg-close hover:text-white`} onClick={() => void closeWindow()}>
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
