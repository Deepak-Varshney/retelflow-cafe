import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { api } from '../api/api';

/**
 * Speaks the voice assistant's answers.
 *   'device' = phone TTS (expo-speech): free and instant
 *   'gemini' = Gemini natural voice from the server: ~1-2s slower, paid per reply
 * Gemini falls back to the phone voice if it fails or takes too long. Never throws.
 */

export type TtsEngine = 'device' | 'gemini';

const GEMINI_TIMEOUT_MS = 2500;

let engine: TtsEngine = 'device';
let player: AudioPlayer | null = null;
// Bumped on every speak/stop so a slow Gemini reply never talks over a newer one
let turn = 0;

export function setTtsEngine(value?: string) {
  engine = value === 'gemini' ? 'gemini' : 'device';
}

// Hinglish in Latin letters reads best with the Indian-English voice.
// "₹4,500" -> "4,500 rupees", "#INV-12" -> "number 12", bullets -> commas.
function normalise(text: string) {
  return text
    .replace(/₹\s?([\d,]+(?:\.\d+)?)/g, '$1 rupees')
    .replace(/#\s?(?:INV-?)?/gi, 'number ')
    .replace(/[•·]/g, ', ');
}

function releasePlayer() {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
  } catch {}
  try {
    p.remove();
  } catch {}
}

function speakDevice(text: string) {
  try {
    Speech.stop();
    Speech.speak(normalise(text), { language: 'en-IN', rate: 1.0 });
  } catch {}
}

async function speakGemini(text: string, myTurn: number) {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GEMINI_TIMEOUT_MS));
    const request = api
      .post('/cafe/tts', { text: text.slice(0, 300) }, { timeout: GEMINI_TIMEOUT_MS })
      .then((res) => res.data)
      .catch(() => null);
    const data: any = await Promise.race([request, timeout]);
    if (myTurn !== turn) return;
    if (!data?.success || !data?.audio) return speakDevice(text);

    const path = `${FileSystem.cacheDirectory}tts-${myTurn}.wav`;
    await FileSystem.writeAsStringAsync(path, data.audio, { encoding: FileSystem.EncodingType.Base64 });
    if (myTurn !== turn) return;

    releasePlayer();
    const p = createAudioPlayer({ uri: path });
    player = p;
    p.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      if (player === p) releasePlayer();
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    });
    p.play();
  } catch {
    if (myTurn === turn) speakDevice(text);
  }
}

export function speak(text: string) {
  if (!text) return;
  const myTurn = ++turn;
  try {
    Speech.stop();
  } catch {}
  releasePlayer();
  if (engine === 'gemini') {
    speakGemini(normalise(text), myTurn).catch(() => {});
  } else {
    speakDevice(text);
  }
}

export function stopSpeaking() {
  turn++;
  try {
    Speech.stop();
  } catch {}
  releasePlayer();
}
