import { fmt } from '../../lib/format';

const OUTLINE = 'press rounded-[8px] border border-hero-line px-3.5 py-2 text-[14px] hover:bg-white/10';

/** Dark bar at the bottom of the Words screen while words are selected. */
export function SelectionBar({ count, hidden, filtered, allFilteredSelected, onSelectAll, onKnown, onToday, onPractise }: {
  count: number; hidden: number; filtered: number; allFilteredSelected: boolean;
  onSelectAll(): void; onKnown(): void; onToday(): void; onPractise(): void;
}) {
  return (
    <div role="region" aria-label="Selection"
      className="absolute bottom-4 left-12 right-[60px] z-10 flex items-center gap-3.5 rounded-[12px] bg-hero py-3 pl-5 pr-3.5 text-hero-ink shadow-[0_12px_30px_rgba(30,34,48,.25)] animate-[bar-in_160ms_ease-out]">
      <span className="text-[15px] font-bold">
        {fmt(count)} selected{hidden > 0 && <span className="font-normal text-hero-body"> ({fmt(hidden)} hidden by filters)</span>}
      </span>
      {!allFilteredSelected && filtered > 0 && (
        <button type="button" onClick={onSelectAll} className="text-[14px] text-hero-body hover:text-hero-ink hover:underline">
          Select all {fmt(filtered)}
        </button>
      )}
      <div className="ml-auto flex gap-2">
        <button type="button" className={OUTLINE} onClick={onKnown}>Mark as known</button>
        <button type="button" className={OUTLINE} onClick={onToday}>Add to today's reviews</button>
        <button type="button" onClick={onPractise}
          className="press rounded-[8px] bg-hero-ink px-3.5 py-2 text-[14px] font-bold text-hero hover:opacity-90">
          Practise {count === 1 ? '1 word' : `${fmt(count)} words`}
        </button>
      </div>
    </div>
  );
}
