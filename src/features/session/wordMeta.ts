import type { Card, Word } from '../../data/types';
import { GENDER_NAME, POS_NAME } from '../../data/defaults';
import { isNewCard } from '../../lib/srs';
import { plural } from '../../lib/format';

/** "B1 · verb" / "B2 · noun, feminine" */
export function levelPos(w: Word): string {
  const g = w.pos === 'n' && w.g ? `, ${GENDER_NAME[w.g]}` : '';
  return `${w.lvl} · ${POS_NAME[w.pos]}${g}`;
}

/** Top-left label on a card. */
export function cardKind(card: Card | undefined, practice: boolean, retry: boolean): string {
  if (practice) return 'Practice';
  if (retry) return 'One more time';
  return isNewCard(card) ? 'New word' : `Review · box ${card!.b}`;
}

/** "Also heard: attends, attendez · heard 186 times in 38 tests" */
export function heardLine(w: Word): string {
  const heard = `heard ${plural(w.n, 'time')} in ${plural(w.tests.length, 'test')}`;
  const forms = w.allForms.filter(f => f.toLowerCase() !== w.key).slice(0, 6);
  return forms.length ? `Also heard: ${forms.join(', ')} · ${heard}` : heard.charAt(0).toUpperCase() + heard.slice(1);
}
