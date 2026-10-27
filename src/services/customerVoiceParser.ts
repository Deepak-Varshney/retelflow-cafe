const HINDI_DIGITS: Record<string, string> = {
  shunya: '0', zero: '0', ek: '1', one: '1', do: '2', two: '2', teen: '3', tin: '3', three: '3',
  char: '4', chaar: '4', four: '4', panch: '5', paanch: '5', five: '5', che: '6', chhe: '6', six: '6',
  sat: '7', saat: '7', seven: '7', aath: '8', ath: '8', eight: '8', nau: '9', no: '9', nine: '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
};

/**
 * Automatically parses voice transcript to determine whether phone, name, or both were spoken.
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
    // Check if phone was spoken digit-by-digit (e.g. "nine eight seven six...")
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

  // 2. Extract Customer Name by removing filler and trigger words
  let extractedName = clean
    .replace(/\b(?:customer|grahak|bhai|ji|naam|name|phone|mobile|number|no|ka|ki|ke|ko|hai|he|h|ka bill|table|table no|table number)\b/gi, '')
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If table was mentioned, keep it clean
  if (transcript.toLowerCase().includes('table')) {
    const tableMatch = transcript.match(/table\s*(?:no\.?|number)?\s*(\d+)/i);
    if (tableMatch) {
      extractedName = `Table ${tableMatch[1]}${extractedName ? ` (${extractedName})` : ''}`;
    }
  }

  // Capitalize name
  if (extractedName.length > 0) {
    extractedName = extractedName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
