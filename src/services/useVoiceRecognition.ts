import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadVoiceRecording } from './voiceRecordingUpload';
import { friendlyError } from '../utils/errorMessage';

// Speech recognizer error codes -> human-friendly message
function voiceErrorText(code?: string, message?: string): string {
  switch (code) {
    case 'no-speech':
    case 'speech-timeout':
      return 'Did not hear anything. Hold the mic and speak.';
    case 'network':
      return 'Voice needs internet. Please check your connection.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission is off. Allow it in phone Settings.';
    case 'audio-capture':
      return 'Microphone is busy or not available.';
    case 'busy':
      return 'Voice engine is busy. Please try again.';
    case 'language-not-supported':
      return 'Language not supported on this device.';
    default:
      return friendlyError(message, 'Voice input stopped. Hold the mic to try again.');
  }
}

// Audio persistence is supported on Android 13+ (API 33) and iOS
const CAN_PERSIST_AUDIO =
  Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 33);

// Saved clips smaller than this are silence / a click: upload the text only
const MIN_AUDIO_BYTES = 8000;

const dropFile = (uri: string) => {
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
};

const nativeStartOptions = (lang: string, persistAudio = true) => ({
  lang,
  interimResults: true,
  continuous: false, // Walkie-Talkie Push-to-Talk: stops on release
  addsPunctuation: true,
  ...(persistAudio && CAN_PERSIST_AUDIO ? { recordingOptions: { persist: true } } : {}),
});

// The phone has ONE speech engine but several screens/components use this hook
// at once (global mic, order screen, voice-add). Native events reach every
// instance, so only the instance that started the session may react to them;
// otherwise the others see a "start" they didn't ask for and abort it.
let nextInstanceId = 1;
let activeOwner = 0;

export interface UseVoiceRecognitionOptions {
  locale?: string;
  onFinalResult?: (transcript: string) => void;
  onPhraseSpoken?: (phrase: string) => void;
  onInterimResult?: (interim: string) => void;
  recordAudio?: boolean;
}

export function useVoiceRecognition(options?: UseVoiceRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentLocale = options?.locale || 'en-IN';
  // Audio clips are opt-in per shop (user.voiceSettings.recordAudio)
  const recordAudio = options?.recordAudio === true;
  const recordAudioRef = useRef(recordAudio);
  recordAudioRef.current = recordAudio;

  const isListeningRef = useRef(false);
  const isPressingRef = useRef(false);
  const instanceIdRef = useRef(0);
  if (!instanceIdRef.current) instanceIdRef.current = nextInstanceId++;
  const isOwner = () => activeOwner === instanceIdRef.current;
  const webRecognitionRef = useRef<any>(null);
  const nativeModuleRef = useRef<any>(null);
  const subscriptionsRef = useRef<any[]>([]);

  const onFinalResultRef = useRef(options?.onFinalResult);
  onFinalResultRef.current = options?.onFinalResult;
  const onPhraseSpokenRef = useRef(options?.onPhraseSpoken);
  onPhraseSpokenRef.current = options?.onPhraseSpoken;
  const onInterimResultRef = useRef(options?.onInterimResult);
  onInterimResultRef.current = options?.onInterimResult;
  const localeRef = useRef(currentLocale);
  localeRef.current = currentLocale;

  // Segment audio & text tracking for background R2 sync
  const segmentTextRef = useRef('');
  const segmentStartRef = useRef(0);

  const flushTranscript = useCallback(() => {
    const text = segmentTextRef.current;
    const started = segmentStartRef.current;
    segmentTextRef.current = '';
    segmentStartRef.current = 0;
    if (text.trim()) {
      uploadVoiceRecording(null, text, started ? (Date.now() - started) / 1000 : 0, localeRef.current);
    }
  }, []);

  useEffect(() => () => flushTranscript(), [flushTranscript]);

  // Initialize native speech recognition safely
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        let speechModule: any = null;
        try {
          speechModule = require('expo-speech-recognition');
        } catch {}

        const mod = speechModule?.ExpoSpeechRecognitionModule;
        if (mod && typeof mod.addListener === 'function') {
          nativeModuleRef.current = mod;

          const subStart = mod.addListener('start', () => {
            if (!isOwner()) return;
            if (!isPressingRef.current) {
              // User already released finger before start event arrived! Kill it immediately.
              try {
                mod.abort?.() || mod.stop?.();
              } catch {}
              setIsListening(false);
              isListeningRef.current = false;
              return;
            }
            if (!segmentStartRef.current) segmentStartRef.current = Date.now();
            setIsListening(true);
            isListeningRef.current = true;
            setError(null);
          });

          const subResult = mod.addListener('result', (event: any) => {
            if (!isOwner()) return;
            if (!isPressingRef.current && !isListeningRef.current) return;
            if (event.results && event.results.length > 0) {
              const best = event.results[0]?.transcript || '';
              if (event.isFinal) {
                if (best && best.trim()) {
                  segmentTextRef.current = `${segmentTextRef.current} ${best.trim()}`.trim();
                  if (onPhraseSpokenRef.current) {
                    onPhraseSpokenRef.current(best.trim());
                  }
                }
                setTranscript((prev) => {
                  const updated = prev ? `${prev} ${best}` : best;
                  if (onFinalResultRef.current) {
                    onFinalResultRef.current(updated);
                  }
                  return updated;
                });
                setInterimTranscript('');
              } else {
                setInterimTranscript(best);
                if (best && best.trim() && onInterimResultRef.current) {
                  onInterimResultRef.current(best.trim());
                }
              }
            }
          });

          const subEnd = () => {
            if (!isOwner()) return;
            setIsListening(false);
            isListeningRef.current = false;
            // No audio file will come (recording off, or Android 12 and older):
            // send the spoken text on its own
            if (!(recordAudioRef.current && CAN_PERSIST_AUDIO)) flushTranscript();
          };
          const endSub = mod.addListener('end', subEnd);

          const subError = mod.addListener('error', (event: any) => {
            if (!isOwner()) return;
            if (event.error !== 'aborted') {
              if (isPressingRef.current) {
                setError(voiceErrorText(event.error, event.message));
              }
            }
            setIsListening(false);
            isListeningRef.current = false;
            isPressingRef.current = false;
          });

          // Audio file recording callbacks (for R2 upload)
          const subAudioStart = mod.addListener('audiostart', (event: any) => {
            if (!isOwner()) return;
            if (event?.uri) segmentStartRef.current = event?.timestamp || Date.now();
          });
          const subAudioEnd = mod.addListener('audioend', async (event: any) => {
            if (!isOwner()) return;
            if (!event?.uri) {
              flushTranscript();
              return;
            }
            const uri: string = event.uri;
            const text = segmentTextRef.current.trim();
            const started = segmentStartRef.current;
            segmentTextRef.current = '';
            segmentStartRef.current = 0;
            // Nothing was said: the clip is useless
            if (!text) return dropFile(uri);
            const durationSec = started ? ((event.timestamp || Date.now()) - started) / 1000 : 0;
            let keepAudio = false;
            try {
              const info: any = await FileSystem.getInfoAsync(uri);
              keepAudio = !!info?.exists && (info.size || 0) >= MIN_AUDIO_BYTES;
            } catch {}
            if (!keepAudio) dropFile(uri);
            uploadVoiceRecording(keepAudio ? uri : null, text, durationSec, localeRef.current);
          });

          subscriptionsRef.current = [subStart, subResult, endSub, subError, subAudioStart, subAudioEnd];
        }
      } catch (e: any) {
        console.warn('Native speech recognition init error:', e?.message);
      }
    }

    return () => {
      subscriptionsRef.current.forEach((sub) => sub?.remove?.());
      subscriptionsRef.current = [];
    };
  }, []);

  const startListening = useCallback(async () => {
    activeOwner = instanceIdRef.current;
    isPressingRef.current = true;
    setIsListening(true);
    isListeningRef.current = true;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    // Anything still unsent from the last press goes up as text first
    flushTranscript();
    segmentStartRef.current = Date.now();

    if (Platform.OS === 'web') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition not supported in this browser');
        return;
      }

      if (webRecognitionRef.current) {
        try {
          webRecognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = currentLocale;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        if (!isPressingRef.current) {
          try { recognition.abort(); } catch {}
          setIsListening(false);
          isListeningRef.current = false;
          return;
        }
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        if (!isPressingRef.current && !isListeningRef.current) return;
        let finalTxt = '';
        let interimTxt = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTxt += item[0].transcript;
          } else {
            interimTxt += item[0].transcript;
          }
        }

        if (finalTxt) {
          if (onPhraseSpokenRef.current) {
            onPhraseSpokenRef.current(finalTxt.trim());
          }
          setTranscript((prev) => {
            const next = prev ? `${prev} ${finalTxt}` : finalTxt;
            if (onFinalResultRef.current) onFinalResultRef.current(next);
            return next;
          });
        }
        setInterimTranscript(interimTxt);
        if (interimTxt && interimTxt.trim() && onInterimResultRef.current) {
          onInterimResultRef.current(interimTxt.trim());
        }
      };

      recognition.onerror = (e: any) => {
        if (isPressingRef.current) setError(e.error);
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
      };

      webRecognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      const mod = nativeModuleRef.current;
      if (mod) {
        try {
          const perm = await mod.requestPermissionsAsync?.();
          if (perm && !perm.granted) {
            setError('Microphone permission denied');
            setIsListening(false);
            isListeningRef.current = false;
            isPressingRef.current = false;
            return;
          }

          // If the user already released their finger while permission check was running:
          if (!isPressingRef.current) {
            setIsListening(false);
            isListeningRef.current = false;
            return;
          }

          mod.start(nativeStartOptions(currentLocale, recordAudio));
        } catch (err: any) {
          setError(err.message);
          setIsListening(false);
          isListeningRef.current = false;
          isPressingRef.current = false;
        }
      } else {
        setError('Speech recognition module not available');
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  }, [currentLocale, recordAudio, flushTranscript]);

  const stopListening = useCallback((opts?: { abort?: boolean }) => {
    // Another instance owns the engine now: don't stop its session
    if (!isOwner()) {
      isPressingRef.current = false;
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }
    isPressingRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);

    if (Platform.OS === 'web') {
      if (webRecognitionRef.current) {
        try {
          if (opts?.abort) webRecognitionRef.current.abort();
          else webRecognitionRef.current.stop();
        } catch {}
      }
    } else {
      const mod = nativeModuleRef.current;
      if (mod) {
        try {
          if (opts?.abort) {
            if (typeof mod.abort === 'function') mod.abort();
            else mod.stop();
          } else {
            mod.stop();
          }
        } catch {}
      }
    }
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
  };
}
