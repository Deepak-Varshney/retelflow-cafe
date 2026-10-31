import { PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type Subscription = { remove(): void };

type NativePcmRecorder = {
  isRecording(): boolean;
  start(): void;
  stop(): void;
  getLastRecordingPath(): string | null;
  getRecordedPcm(): string | null;
  clearLastRecording(): boolean;
  addListener(event: 'onAudioChunk', listener: (e: { data: string }) => void): Subscription;
};

// Null on web / iOS / Expo Go — only the Android build has it.
const Native = requireOptionalNativeModule<NativePcmRecorder>('PcmRecorder');

export const isPcmRecorderAvailable = Native != null;

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Starts streaming the mic as 16 kHz mono PCM16, base64, ~100 ms per chunk.
 * Returns a stop function.
 */
export async function startPcmStream(onChunk: (base64: string) => void): Promise<() => void> {
  if (!Native) throw new Error('Live voice needs the latest RetelFlow Cafe app build.');
  if (!(await requestMicPermission())) throw new Error('Microphone permission is required for voice ordering.');
  const sub = Native.addListener('onAudioChunk', (e) => onChunk(e.data));
  try {
    Native.start();
  } catch (err) {
    sub.remove();
    throw err;
  }
  return () => {
    sub.remove();
    Native.stop();
  };
}

/**
 * Returns the absolute path of the last recorded raw PCM audio file
 * (stored in app cacheDir/cafe_voice_last.pcm), or null if none exists.
 */
export function getLastRecordingPath(): string | null {
  return Native?.getLastRecordingPath?.() ?? null;
}

/**
 * Returns the base64-encoded raw PCM audio of the last recording, or null if none exists.
 */
export function getRecordedPcm(): string | null {
  return Native?.getRecordedPcm?.() ?? null;
}

/**
 * Deletes the local raw PCM audio cache file.
 */
export function clearLastRecording(): boolean {
  return Native?.clearLastRecording?.() ?? false;
}
