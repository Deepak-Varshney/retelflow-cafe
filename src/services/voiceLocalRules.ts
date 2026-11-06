import { MenuItem } from '../types';
import { VoiceForm } from './voiceTargets';

/**
 * Layer 1 of the voice assistant: common commands understood on the phone,
 * instantly and offline. Anything not matched here goes to the server.
 */

export const normText = (s?: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasWords = (text: string, phrase: string) => {
  const p = normText(phrase);
  return p.length >= 3 && ` ${text} `.includes(` ${p} `);
};

/** Menu dishes whose full name (or alias) was spoken, longest names first. */
export function findSpokenDishes(text: string, menu: MenuItem[]): MenuItem[] {
  const t = normText(text);
  const hits = menu.filter((m) => hasWords(t, m.name) || (m.aliases || []).some((a) => hasWords(t, a)));
  // "cold coffee" shouldn't also count as "coffee"
  return hits
    .sort((a, b) => b.name.length - a.name.length)
    .filter((m, i, all) => !all.slice(0, i).some((o) => normText(o.name).includes(normText(m.name))));
}

/** Size of a dish that was spoken ("large", "500 ml"), if any. */
export function spokenVariant(text: string, item: MenuItem) {
  const t = normText(text);
  return (item.variants || []).find((v) => {
    const words = normText(v.name).split(' ').filter((w) => w.length >= 2 && !/^\d+$/.test(w));
    return hasWords(t, v.name) || words.some((w) => hasWords(t, w));
  });
}

/** Sentences that are questions, not orders ("aaj kitni sale hui"). */
export const isQuestion = (text: string) =>
  /\b(kitn[aie]|kaun ?sa|kon ?sa|konsa|kaunsa|kya .*(bik|sale)|batao|bataiye|last bill|kiska|kis ka|udhaar|udhar|due|report|total sale)\b/i.test(
    text
  );

const PRICE_WORDS = '(?:price|rate|daam|dam|kimat|keemat|amount)';
const DO_WORDS = '(?:kar ?do|kardo|karo|kr ?do|krdo|set ?kar ?do|set|rakho|rakh do)';

/** Dish form open: price swaps, description dictation, sizes off. */
export function localFormCommand(text: string, form: VoiceForm): { form: VoiceForm; notice: string } | null {
  const raw = String(text || '').trim();
  const t = normText(raw);

  // "price 80 se 120 kardo" / "80 ko 120 kar do"
  const swap = t.match(/(\d+)\s*(?:se|to|ko|say|from)\s*(\d+)/);
  if (swap && new RegExp(`${PRICE_WORDS}|${DO_WORDS}`).test(t)) {
    const from = Number(swap[1]);
    const to = Number(swap[2]);
    let changed = form.price === from;
    const variants = form.variants.map((v) => {
      if (v.price !== from) return v;
      changed = true;
      return { ...v, price: to };
    });
    if (!changed) return null;
    return {
      form: { ...form, price: form.price === from ? to : variants[0]?.price ?? form.price, variants },
      notice: `₹${from} → ₹${to}`,
    };
  }

  // "description me likho this is a best coffee"
  const desc = raw.match(/(?:description|discription|desc)\w*\s+(?:me|mein|main|mai|m|mei)?\s*(?:likho|likh do|likhdo|daalo|dalo|add karo|likhiye)\s+(.+)/i);
  if (desc) {
    const body = desc[1].trim();
    const sentence = body.charAt(0).toUpperCase() + body.slice(1);
    return { form: { ...form, description: /[.!?]$/.test(sentence) ? sentence : `${sentence}.` }, notice: 'Description likh di' };
  }

  // "variants band kardo" / "sizes hata do"
  if (/\b(variants?|sizes?)\b.*\b(band|off|hata|hatao|nikal)/.test(t)) {
    const price = form.price || form.variants[0]?.price || 0;
    return { form: { ...form, variants: [], price }, notice: 'Sizes band kar diye' };
  }
  return null;
}

export type LocalMenuCommand =
  | { kind: 'price'; item: MenuItem; variantName?: string; price: number }
  | { kind: 'delete'; item: MenuItem };

/** Menu list: "cold coffee ka price 130 kardo", "chai hata do" (one dish only). */
export function localMenuCommand(text: string, menu: MenuItem[]): LocalMenuCommand | null {
  const t = normText(text);
  const dishes = findSpokenDishes(t, menu);
  if (dishes.length !== 1) return null; // several dishes: let the server split it up
  const item = dishes[0];

  const price = t.match(new RegExp(`${PRICE_WORDS}\\s*(\\d+)|(\\d+)\\s*(?:rupaye|rupay|rs|ka|ki)?\\s*${DO_WORDS}`));
  if (price && new RegExp(PRICE_WORDS).test(t) && !/(badha|ghata|kam|zyada|jyada|increase|decrease)/.test(t)) {
    const value = Number(price[1] || price[2]);
    if (!value) return null;
    const hasSizes = (item.variants || []).length > 1;
    const v = spokenVariant(t, item);
    if (hasSizes && !v) return null; // which size? ask the server
    return { kind: 'price', item, variantName: v?.name, price: value };
  }

  if (/\b(hata ?do|hatao|delete|remove|nikal ?do|mita ?do)\b/.test(t) && !/\d/.test(t)) {
    return { kind: 'delete', item };
  }
  return null;
}
