import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

export interface UseVoiceRecognitionOptions {
  locale?: string;
  onFinalResult?: (transcript: string) => void;
  onPhraseSpoken?: (phrase: string) => void;
}

export function useVoiceRecognition(options?: UseVoiceRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentLocale = options?.locale || 'hi-IN';
  const isListeningRef = useRef(false);
  const webRecognitionRef = useRef<any>(null);
  const nativeModuleRef = useRef<any>(null);
  const subscriptionsRef = useRef<any[]>([]);

  const onFinalResultRef = useRef(options?.onFinalResult);
  onFinalResultRef.current = options?.onFinalResult;
  const onPhraseSpokenRef = useRef(options?.onPhraseSpoken);
  onPhraseSpokenRef.current = options?.onPhraseSpoken;

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
            setIsListening(true);
            isListeningRef.current = true;
            setError(null);
          });

          const subResult = mod.addListener('result', (event: any) => {
            if (event.results && event.results.length > 0) {
              const best = event.results[0]?.transcript || '';
              if (event.isFinal) {
                if (best && best.trim()) {
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
              }
            }
          });

          const subEnd = mod.addListener('end', () => {
            setIsListening(false);
            isListeningRef.current = false;
          });

          const subError = mod.addListener('error', (event: any) => {
            console.warn('[Speech Error]:', event.error);
            setError(event.message || event.error);
            setIsListening(false);
            isListeningRef.current = false;
          });

          subscriptionsRef.current = [subStart, subResult, subEnd, subError];
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
    setError(null);
    setTranscript('');
    setInterimTranscript('');

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
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
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
      };

      recognition.onerror = (e: any) => {
        setError(e.error);
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
            return;
          }

          mod.start({
            lang: currentLocale,
            interimResults: true,
            continuous: true,
            addsPunctuation: true,
          });
        } catch (err: any) {
          setError(err.message);
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setError('Speech recognition module not available');
      }
    }
  }, [currentLocale]);

  const stopListening = useCallback(() => {
    if (Platform.OS === 'web') {
      if (webRecognitionRef.current) {
        try {
          webRecognitionRef.current.stop();
        } catch {}
      }
    } else {
      const mod = nativeModuleRef.current;
      if (mod) {
        try {
          mod.stop();
        } catch {}
      }
    }
    setIsListening(false);
    isListeningRef.current = false;
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
