// Spoken numbers 0-100 the way Indian speech-to-text writes them (Hindi
// words come out in many spellings: "bahattar", "behattar", "bahtar"...).
// Matching goes through numKey(), which also evens out spelling differences.
const NUMBER_WORDS: Array<[number, string[]]> = [
  [0, ['shunya', 'sunya', 'zero', 'jero', 'oh']],
  [1, ['ek', 'one']],
  [2, ['do', 'two']],
  [3, ['teen', 'tin', 'three']],
  [4, ['char', 'chaar', 'four']],
  [5, ['panch', 'paanch', 'five']],
  [6, ['chhe', 'che', 'chhah', 'chah', 'cheh', 'six']],
  [7, ['saat', 'sat', 'seven']],
  [8, ['aath', 'ath', 'eight']],
  [9, ['nau', 'nine']],
  [10, ['das', 'dus', 'ten']],
  [11, ['gyarah', 'gyara', 'gyaarah', 'eleven']],
  [12, ['barah', 'bara', 'baarah', 'twelve']],
  [13, ['terah', 'tera', 'thirteen']],
  [14, ['chaudah', 'chauda', 'chodah', 'choda', 'fourteen']],
  [15, ['pandrah', 'pandra', 'pandhrah', 'fifteen']],
  [16, ['solah', 'sola', 'sixteen']],
  [17, ['satrah', 'satra', 'seventeen']],
  [18, ['atharah', 'athara', 'attharah', 'eighteen']],
  [19, ['unnis', 'unis', 'unnees', 'nineteen']],
  [20, ['bees', 'bis', 'twenty']],
  [21, ['ikkis', 'ikis', 'ikkees']],
  [22, ['bais', 'baais', 'baees']],
  [23, ['teis', 'teyis', 'tees ek']],
  [24, ['chaubis', 'chobis', 'chaubees']],
  [25, ['pachis', 'pachchis', 'pachees', 'pacchis']],
  [26, ['chhabbis', 'chabbis', 'chabis', 'chhabees']],
  [27, ['sattais', 'satais', 'sattaees']],
  [28, ['atthais', 'athais', 'athaais', 'atthaees']],
  [29, ['untis', 'unatis', 'untees']],
  [30, ['tees', 'tis', 'thirty']],
  [31, ['ikattis', 'iktis', 'ikatis', 'iktees']],
  [32, ['battis', 'batis', 'battees']],
  [33, ['taintis', 'tentis', 'taitis', 'taintees']],
  [34, ['chautis', 'chontis', 'chotis', 'chauntees']],
  [35, ['paintis', 'pentis', 'paintees']],
  [36, ['chhattis', 'chattis', 'chhatis', 'chhattees']],
  [37, ['saintis', 'sentis', 'saintees']],
  [38, ['adtis', 'artis', 'adatis', 'adtees']],
  [39, ['untalis', 'unchalis', 'untaalees']],
  [40, ['chalis', 'chaalis', 'chaalees', 'forty']],
  [41, ['iktalis', 'ikatalis', 'iktaalees']],
  [42, ['bayalis', 'byalis', 'bayaalis', 'bayaalees']],
  [43, ['taintalis', 'tentalis', 'taintaalees']],
  [44, ['chavalis', 'chauvalis', 'chawalis', 'chauvaalees']],
  [45, ['paintalis', 'pentalis', 'paintaalees']],
  [46, ['chhiyalis', 'chiyalis', 'chhiyaalees']],
  [47, ['saintalis', 'sentalis', 'saintaalees']],
  [48, ['adtalis', 'artalis', 'adtaalees']],
  [49, ['unchas', 'unanchas', 'unchaas']],
  [50, ['pachas', 'pachaas', 'fifty']],
  [51, ['ikyavan', 'ikyawan', 'ikkyavan', 'ekyavan', 'ikyaavan']],
  [52, ['bavan', 'baavan', 'bawan']],
  [53, ['tirpan', 'tirepan', 'tirpann']],
  [54, ['chauvan', 'chauwan', 'chovan']],
  [55, ['pachpan']],
  [56, ['chhappan', 'chappan']],
  [57, ['sattavan', 'satavan', 'sattawan']],
  [58, ['atthavan', 'athavan', 'atthawan']],
  [59, ['unsath', 'unasath']],
  [60, ['saath', 'sath', 'sixty']],
  [61, ['iksath', 'ikasath']],
  [62, ['basath', 'baasath']],
  [63, ['tirsath', 'tiresath']],
  [64, ['chausath', 'chosath']],
  [65, ['painsath', 'pensath']],
  [66, ['chhiyasath', 'chiyasath']],
  [67, ['sarsath', 'sadsath']],
  [68, ['adsath', 'arsath']],
  [69, ['unhattar', 'unattar']],
  [70, ['sattar', 'satar', 'seventy']],
  [71, ['ikhattar', 'ikattar']],
  [72, ['bahattar', 'bahatar', 'behattar', 'bahtar', 'baattar']],
  [73, ['tihattar', 'tihatar', 'tehattar']],
  [74, ['chauhattar', 'chohattar']],
  [75, ['pachhattar', 'pachattar', 'pichattar']],
  [76, ['chhihattar', 'chihattar']],
  [77, ['satattar', 'sathattar', 'sathhattar']],
  [78, ['athhattar', 'athattar', 'atthattar']],
  [79, ['unasi', 'unaasi', 'unyasi']],
  [80, ['assi', 'asi', 'eighty']],
  [81, ['ikyasi', 'ikiyasi', 'ikyaasi']],
  [82, ['bayasi', 'byasi', 'bayaasi']],
  [83, ['tirasi', 'tiraasi', 'trasi', 'trashi', 'tirashi', 'tiraashi']],
  [84, ['chaurasi', 'chorasi', 'chaurasee']],
  [85, ['pachasi', 'pachaasi']],
  [86, ['chhiyasi', 'chiyasi']],
  [87, ['sattasi', 'satasi']],
  [88, ['atthasi', 'athasi']],
  [89, ['navasi', 'nawasi']],
  [90, ['nabbe', 'nabe', 'ninety']],
  [91, ['ikyanve', 'ikyanave', 'ikyaanve']],
  [92, ['banve', 'baanve']],
  [93, ['tiranve', 'tiraanve']],
  [94, ['chauranve', 'choraanve']],
  [95, ['pachanve', 'pachaanve']],
  [96, ['chhiyanve', 'chiyanve']],
  [97, ['sattanve', 'sattaanve']],
  [98, ['atthanve', 'atthaanve']],
  [99, ['ninyanve', 'ninyaanve', 'nineanve']],
  [100, ['sau', 'hundred']],
];

const ENGLISH_ONES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
const ENGLISH_TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Evens out spellings: doubled letters, w/v, sh/s, ee/i… ("bahattar" = "bahatar"). */
const numKey = (w: string) =>
  w
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/w/g, 'v')
    .replace(/sh/g, 's')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1');

const NUMBER_LOOKUP: Record<string, string> = {};
for (const [n, words] of NUMBER_WORDS) for (const w of words) NUMBER_LOOKUP[numKey(w)] = String(n);

const DEVA_NUMBER_WORDS: Record<string, string> = {
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'छः': '6',
  'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
};

/** Digits for one spoken word, or null if it isn't a number. */
function numberOf(word: string): string | null {
  if (/^\d+$/.test(word)) return word;
  if (/^[०-९]+$/.test(word)) return Array.from(word).map((c) => DEVA_NUMBERS[c]).join('');
  if (DEVA_NUMBER_WORDS[word]) return DEVA_NUMBER_WORDS[word];
  const latin = /[\u0900-\u097f]/.test(word) ? transliterateDevanagariToLatin(word) : word;
  const key = numKey(latin);
  return key ? NUMBER_LOOKUP[key] ?? null : null;
}

// Common words that are also number words ("kar do", "ek minute"): they only
// count as numbers next to another number
const WEAK_NUMBER_WORDS = new Set(['do', 'ek', 'sat', 'tin', 'bis', 'tis', 'asi', 'oh', 'one']);

/**
 * Splits spoken words into the phone digits and the rest (the name).
 * "bahattar ikyavan tirasi zero" -> "7251830"; "Deepak Varshney 98…" -> name + digits.
 */
function splitDigits(text: string): { digits: string; rest: string[] } {
  const words = text
    .replace(/[^a-zA-Z0-9ऀ-ॿ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const vals = words.map((w) => numberOf(w.toLowerCase()));

  // "seventy two", "double five", "triple zero"
  const parts: Array<string | null> = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    const next = words[i + 1]?.toLowerCase();
    if (ENGLISH_TENS[w] && next && ENGLISH_ONES[next]) {
      parts.push(String(ENGLISH_TENS[w] + ENGLISH_ONES[next]), '');
      i++;
      continue;
    }
    if ((w === 'double' || w === 'triple') && i + 1 < words.length && vals[i + 1]) {
      parts.push(vals[i + 1]!.repeat(w === 'double' ? 2 : 3), '');
      i++;
      continue;
    }
    parts.push(vals[i]);
  }

  let digits = '';
  const rest: string[] = [];
  parts.forEach((v, i) => {
    if (v === '') return; // second word of a pair handled above
    const word = words[i];
    const isWeak = WEAK_NUMBER_WORDS.has(numKey(word || ''));
    const nearNumber = (j: number) => parts[j] !== undefined && parts[j] !== null && parts[j] !== '';
    if (v !== null && (!isWeak || nearNumber(i - 1) || nearNumber(i + 1))) digits += v;
    else if (word) rest.push(word);
  });
  return { digits, rest };
}

const DEVA_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
};

const DEVA_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '', '़': '',
};

const DEVA_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gya', 'श्र': 'shr',
};

const DEVA_NUMBERS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/**
 * Transliterates Devanagari Hindi text into natural Latin/Hinglish characters.
 * E.g., 'दीपक' -> 'deepak', 'राहुल शर्मा' -> 'rahul sharma', 'टेबल ४' -> 'table 4'.
 */
export function transliterateDevanagariToLatin(text: string): string {
  if (!text) return '';
  let res = '';
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (DEVA_NUMBERS[ch] !== undefined) {
      res += DEVA_NUMBERS[ch];
    } else if (DEVA_VOWELS[ch] !== undefined) {
      res += DEVA_VOWELS[ch];
    } else if (DEVA_CONSONANTS[ch] !== undefined) {
      const base = DEVA_CONSONANTS[ch];
      if (next && DEVA_MATRAS[next] !== undefined) {
        res += base + DEVA_MATRAS[next];
        i++;
      } else if (next && next === '्') {
        res += base;
        i++;
      } else {
        const isEnd = !next || /\s|[.,!?;:()]/.test(next);
        res += isEnd ? base : base + 'a';
      }
    } else if (DEVA_MATRAS[ch] !== undefined) {
      res += DEVA_MATRAS[ch];
    } else {
      res += ch;
    }
  }
  return res.replace(/\btebal\b/gi, 'Table');
}

/**
 * Automatically parses voice transcript to determine whether phone, name, or both were spoken.
 * Returns clean Hinglish/English text (strictly no Devanagari characters).
 */
export function parseCustomerVoice(transcript: string): {
  name: string;
  phone: string;
  /** Digits heard so far (while still speaking), up to 10 */
  phonePartial: string;
  detectedType: 'phone' | 'name' | 'both' | 'none';
} {
  let clean = (transcript || '').trim();
  if (!clean) return { name: '', phone: '', phonePartial: '', detectedType: 'none' };

  // 1. Number words / digits -> phone; everything else stays for the name
  const { digits, rest } = splitDigits(clean);
  let extractedPhone = '';
  const start = digits.search(/[6-9]/);
  if (start !== -1 && digits.length - start >= 10) extractedPhone = digits.slice(start, start + 10);
  const phonePartial = extractedPhone || (start === -1 ? digits : digits.slice(start)).slice(0, 10);
  clean = rest.join(' ');

  // 2. Transliterate all Devanagari Hindi text to clean Latin Hinglish
  clean = transliterateDevanagariToLatin(clean);

  // 3. Extract Customer Name by removing filler and trigger words
  let extractedName = clean
    .replace(/\b(?:customer|grahak|bhai|ji|naam|name|phone|mobile|number|no|ka|ki|ke|ko|hai|he|h|ka bill|table|table no|table number|mera|meri|likho|likh|do|aur|and|is)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If table was mentioned, format clean e.g. "Table 4"
  if (/table\s*(?:no\.?|number)?\s*(\d+)/i.test(transcript) || /टेबल\s*(\d+|[०-९]+)/i.test(transcript)) {
    const tableNum = (transcript.match(/\d+/) || transcript.match(/[०-९]+/))?.[0];
    if (tableNum) {
      const latinNum = transliterateDevanagariToLatin(tableNum);
      extractedName = `Table ${latinNum}${extractedName && extractedName !== `Table ${latinNum}` ? ` (${extractedName})` : ''}`;
    }
  }

  // Capitalize name
  if (extractedName.length > 0) {
    extractedName = extractedName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  let detectedType: 'phone' | 'name' | 'both' | 'none' = 'none';
  if (extractedName && extractedPhone) detectedType = 'both';
  else if (extractedPhone) detectedType = 'phone';
  else if (extractedName) detectedType = 'name';

  return {
    name: extractedName,
    phone: extractedPhone,
    phonePartial,
    detectedType,
  };
}
