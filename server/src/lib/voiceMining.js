// Voice mining: estrazione keyword anonime dai messaggi chat per capire i temi
// ricorrenti (contenuti Instagram + libreria cognitiva).
// PRIVACY: mai testo completo, mai userId accanto alle keyword, solo parole sciolte.

const STOP_WORDS = new Set([
  'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'una', 'uno',
  'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'e', 'o', 'ma', 'se', 'che', 'chi', 'cui',
  'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro',
  'mi', 'ti', 'si', 'ci', 'vi',
  'sono', 'sei', 'è', 'ho', 'hai', 'ha',
  'mio', 'tuo', 'suo', 'questo', 'quello',
  'non', 'sì', 'no', 'anche', 'però',
  'come', 'quando', 'dove', 'perché', 'cosa',
  'già', 'ancora', 'sempre', 'mai',
  'molto', 'poco', 'più', 'meno',
  'oggi', 'ieri', 'domani',
]);

// Estrae fino a 10 keyword sciolte e deduplicate da un testo.
// Tiene solo token alfabetici (anche accentati) di lunghezza >= 3, non stop word.
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  const tokens = text.toLowerCase().match(/[a-zàèéìòùáíóúäëïöü]+/g) || [];
  const seen = new Set();
  const out = [];
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    if (STOP_WORDS.has(tok)) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= 10) break;
  }
  // Ordina alfabeticamente: distrugge l'ordine originale del messaggio così le
  // keyword restano "sciolte" e non ricostruibili in frase (privacy).
  return out.sort();
}

module.exports = { extractKeywords, STOP_WORDS };
