import { hydrate, withArticle } from './words';
import type { WordRow } from './types';

const row = (fr: string, pos: WordRow[2], g: WordRow[3], more = ''): WordRow =>
  [fr, 'invoice, bill; note', pos, g, 'B1', 12, [1, 3], [fr + 's'], [['Voici la ' + fr + '.', fr, 3, 4]], more];

test('hydrate builds keys and normalised fields', () => {
  const [w] = hydrate([row('Facture', 'n', 'f', 'facturé facturer')]);
  expect(w.i).toBe(0);
  expect(w.key).toBe('facture');
  expect(w.allForms).toEqual(['Factures', 'facturé', 'facturer']);
  expect(w.nforms).toEqual(['factures', 'facture', 'facturer']);
  expect(w.first).toBe('invoice, bill');
  expect(w.senses).toEqual(['invoice, bill', 'note']);
});

test('withArticle adds the right article to nouns only', () => {
  const ws = hydrate([row('facture', 'n', 'f'), row('eau', 'n', 'f'), row('élève', 'n', 'mf'), row('réveil', 'n', 'm'),
    row('homme', 'n', 'm'), row('aller', 'v', '')]);
  expect(ws.map(withArticle)).toEqual(['la facture', "l'eau", "l'élève", 'le réveil', "l'homme", 'aller']);
});
