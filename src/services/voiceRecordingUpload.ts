import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../api/api';
import { authStorage } from '../auth/authStorage';

/**
 * Uploads audio that speech recognition saved on the phone, plus the spoken transcript,
 * to Cloudflare R2 for the superadmin dashboard (/admin/recordings).
 *
 * Runs asynchronously in the background. Failures are silently ignored and
 * the temporary local audio file is always cleaned up afterwards.
 */
const queue: { uri: string | null; transcript: string; durationSec: number; language: string }[] = [];
let busy = false;

async function recordingEnabled() {
  const user = await authStorage.getUser();
  // Can be switched off per shop from admin
  return user?.voiceSettings?.recordVoice !== false;
}

async function drain() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift()!;
    try {
      if (await recordingEnabled()) {
        const form = new FormData();
        if (job.uri) {
          form.append('audio', {
            uri: job.uri,
            name: job.uri.split('/').pop() || 'recording.wav',
            type: 'audio/wav',
          } as any);
        }
        form.append('transcript', job.transcript);
        form.append('durationSec', String(Math.round(job.durationSec)));
        if (job.language) form.append('language', job.language);
        await api.post('/voice/recording', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
      }
    } catch {
      // Best effort background sync
    } finally {
      if (job.uri) {
        FileSystem.deleteAsync(job.uri, { idempotent: true }).catch(() => {});
      }
    }
  }
  busy = false;
}

export function uploadVoiceRecording(
  uri: string | null | undefined,
  transcript: string,
  durationSec: number,
  language = ''
) {
  const text = (transcript || '').trim();
  if (Platform.OS === 'web' || (!uri && !text)) return;
  queue.push({ uri: uri || null, transcript: text, durationSec: durationSec || 0, language });
  setTimeout(drain, 1200);
}

/**
 * Shop setting "keep audio clips" (user.voiceSettings.recordAudio, off unless
 * admin turned it on). Read once from the saved profile; pass it to
 * useVoiceRecognition({ recordAudio }).
 */
export function useRecordAudioSetting() {
  const [recordAudio, setRecordAudio] = useState(false);
  useEffect(() => {
    let alive = true;
    authStorage
      .getUser()
      .then((user: any) => alive && setRecordAudio(user?.voiceSettings?.recordAudio === true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return recordAudio;
}
