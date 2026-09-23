import type { Example as Ex } from '../data/types';
import { escRe } from '../lib/text';

/** Example sentence in italics with « », the heard form highlighted in roman. */
export function Example({ ex, className = 'text-[24px] leading-[1.35]' }: { ex: Ex; className?: string }) {
  const [text, form] = ex;
  const m = form ? new RegExp(`(^|[^\\p{L}])(${escRe(form)})(?![\\p{L}])`, 'iu').exec(text) : null;
  const body = !m ? text : (
    <>
      {text.slice(0, m.index + m[1].length)}
      <mark className="rounded-[3px] bg-accent-soft px-1 font-serif not-italic text-accent-strong">{m[2]}</mark>
      {text.slice(m.index + m[0].length)}
    </>
  );
  return <p lang="fr" className={`m-0 font-serif italic ${className}`}>« {body} »</p>;
}
