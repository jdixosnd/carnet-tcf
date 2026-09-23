import type { Rating, Word } from '../../data/types';
import type { Direction } from '../../data/types';

export function ListenChoose({ word, onResult }: { word: Word; dir?: Direction; practice: boolean; retry: boolean; onResult(r: Rating): void; onSwitchToType?(): void }) {
  return <button type="button" onClick={() => onResult('knew')}>{word.fr}</button>;
}
