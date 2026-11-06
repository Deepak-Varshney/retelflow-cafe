import * as Speech from 'expo-speech';

/**
 * Speaks the voice assistant's answers with the phone's own voice
 * (expo-speech): free and instant. Never throws.
 */

// Hinglish in Latin letters reads best with the Indian-English voice.
// "₹4,500" -> "4,500 rupees", "#INV-12" -> "number 12", bullets -> commas.
function normalise(text: string) {
  return text
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, '$1 rupees')
    .replace(/#\s?(?:INV-?)?/gi, 'number ')
    .replace(/[•·]/g, ', ');
}

export function speak(text: string) {
  if (!text) return;
  try {
    Speech.stop();
    Speech.speak(normalise(text), { language: 'en-IN', rate: 1.0 });
  } catch {}
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {}
}
