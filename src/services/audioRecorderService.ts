import { Platform } from 'react-native';
import { AudioModule, RecordingPresets } from 'expo-audio';

let activeRecorder: any = null;
let recordingStartTime = 0;

export async function requestMicPermission(): Promise<boolean> {
  try {
    const res = await AudioModule.requestRecordingPermissionsAsync();
    return res.granted;
  } catch (err) {
    console.warn('[AudioRecorder] Permission error:', err);
    return false;
  }
}

export async function startAudioRecording(): Promise<boolean> {
  try {
    const hasPerm = await requestMicPermission();
    if (!hasPerm) return false;

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    if (activeRecorder) {
      try {
        await activeRecorder.stop();
      } catch {}
      activeRecorder = null;
    }

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    activeRecorder = recorder;
    recordingStartTime = Date.now();
    return true;
  } catch (err) {
    console.warn('[AudioRecorder] Start recording error:', err);
    return false;
  }
}

export async function stopAudioRecording(): Promise<{ uri: string | null; durationSec: number }> {
  if (!activeRecorder) {
    return { uri: null, durationSec: 0 };
  }

  const durationSec = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
  recordingStartTime = 0;

  try {
    const recorder = activeRecorder;
    activeRecorder = null;
    await recorder.stop();
    return {
      uri: recorder.uri || null,
      durationSec,
    };
  } catch (err) {
    console.warn('[AudioRecorder] Stop recording error:', err);
    return { uri: null, durationSec };
  }
}

export function isAudioRecording(): boolean {
  return Boolean(activeRecorder?.isRecording);
}
