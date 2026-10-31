const HINDI_DIGITS: Record<string, string> = {
  shunya: '0', zero: '0', ek: '1', one: '1', do: '2', two: '2', teen: '3', tin: '3', three: '3',
  char: '4', chaar: '4', four: '4', panch: '5', paanch: '5', five: '5', che: '6', chhe: '6', six: '6',
  sat: '7', saat: '7', seven: '7', aath: '8', ath: '8', eight: '8', nau: '9', no: '9', nine: '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
};

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
  detectedType: 'phone' | 'name' | 'both' | 'none';
} {
  let clean = (transcript || '').trim();
  if (!clean) return { name: '', phone: '', detectedType: 'none' };

  // 1. Direct 10-digit number check (e.g. 9876543210, 7251830075)
  const phoneMatch = clean.match(/\b([6-9]\d{9})\b/);
  let extractedPhone = '';

  if (phoneMatch) {
    extractedPhone = phoneMatch[1];
    clean = clean.replace(extractedPhone, '');
  } else {
    // Check if phone was spoken digit-by-digit or in Hindi words
    const words = clean.toLowerCase().split(/\s+/);
    let digitSeq = '';
    const nonDigitWords: string[] = [];

    for (const w of words) {
      if (HINDI_DIGITS[w] !== undefined) {
        digitSeq += HINDI_DIGITS[w];
      } else if (/^\d+$/.test(w)) {
        digitSeq += w;
      } else {
        nonDigitWords.push(w);
      }
    }

    if (digitSeq.length >= 10) {
      const validPrefixIdx = digitSeq.search(/[6-9]/);
      if (validPrefixIdx !== -1 && digitSeq.length - validPrefixIdx >= 10) {
        extractedPhone = digitSeq.slice(validPrefixIdx, validPrefixIdx + 10);
      }
    }

    if (extractedPhone) {
      clean = nonDigitWords.join(' ');
    }
  }

  // 2. Transliterate all Devanagari Hindi text to clean Latin Hinglish
  clean = transliterateDevanagariToLatin(clean);

  // 3. Extract Customer Name by removing filler and trigger words
  let extractedName = clean
    .replace(/\b(?:customer|grahak|bhai|ji|naam|name|phone|mobile|number|no|ka|ki|ke|ko|hai|he|h|ka bill|table|table no|table number)\b/gi, '')
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
    detectedType,
  };
}
