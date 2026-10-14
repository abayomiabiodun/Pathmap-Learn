'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/preferences';
import {
  matchingVoice,
  speechChunks,
  speechLanguages,
  type Recognition,
  type SpeechWindow,
} from '@/lib/speech';

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function SpeechInput({
  locale,
  value,
  onChange,
  onListening,
}: {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  onListening: (value: boolean) => void;
}) {
  const t = useTranslations();
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('');
  const [interim, setInterim] = useState('');
  const current = useRef<Recognition | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      const recognition = current.current;
      current.current = null;
      if (recognition) {
        recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
        recognition.abort();
      }
      clearTimeout(timeout.current);
      onListening(false);
    },
    [onListening],
  );
  function toggle() {
    if (current.current) {
      current.current.stop();
      return;
    }
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setStatus('voice_no_mic');
      return;
    }
    window.dispatchEvent(new Event('pathmap-stop-speech'));
    let recognition: Recognition;
    try {
      recognition = new Constructor();
    } catch {
      setStatus('voice_error');
      return;
    }
    current.current = recognition;
    recognition.lang = speechLanguages[locale];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const original = value.trim();
    let received = false;
    let errorState = false;
    const finish = () => {
      if (current.current !== recognition) return;
      current.current = null;
      clearTimeout(timeout.current);
      setActive(false);
      setInterim('');
      onListening(false);
      setStatus((previous) =>
        errorState ? previous : received ? 'voice_review' : 'voice_no_speech',
      );
    };
    recognition.onstart = () => {
      if (current.current === recognition) setStatus('voice_listening');
    };
    recognition.onend = finish;
    recognition.onerror = ({ error }) => {
      if (current.current !== recognition) return;
      errorState = true;
      setStatus(
        error === 'not-allowed' || error === 'service-not-allowed'
          ? 'voice_denied'
          : error === 'language-not-supported'
            ? 'voice_language_missing'
            : error === 'no-speech'
              ? 'voice_no_speech'
              : 'voice_error',
      );
      finish();
    };
    recognition.onresult = ({ results }) => {
      if (current.current !== recognition) return;
      const items = Array.from(results);
      const final = items
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(' ');
      setInterim(
        items
          .filter((result) => !result.isFinal)
          .map((result) => result[0].transcript)
          .join(' '),
      );
      if (final) {
        received = true;
        onChange([original, final].filter(Boolean).join(' ').slice(0, 600));
        setStatus('voice_review');
      }
    };
    try {
      setActive(true);
      onListening(true);
      setStatus('voice_starting');
      recognition.start();
      timeout.current = setTimeout(() => {
        if (current.current === recognition) recognition.stop();
      }, 45000);
    } catch {
      errorState = true;
      finish();
      setStatus('voice_error');
    }
  }
  return (
    <div className="assistant-voice-input">
      <button
        type="button"
        className="button button-outline"
        onClick={toggle}
        aria-pressed={active}
      >
        {t(active ? 'voice_mic_stop' : 'voice_mic')}
      </button>
      {(status || interim) && (
        <p role="status">
          {status && t(status)}
          {interim && <span> {interim}</span>}
        </p>
      )}
    </div>
  );
}

export function ReadAloud({
  locale,
  text,
  disabled = false,
}: {
  locale: Locale;
  text: string;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const stop = () => {
      if (current.current && activeUtterance === current.current) {
        window.speechSynthesis?.cancel();
        activeUtterance = null;
      }
      current.current = null;
      setPlaying(false);
    };
    window.addEventListener('pathmap-stop-speech', stop);
    return () => {
      window.removeEventListener('pathmap-stop-speech', stop);
      if (current.current && activeUtterance === current.current) {
        window.speechSynthesis?.cancel();
        activeUtterance = null;
      }
      current.current = null;
    };
  }, [locale, text]);
  function toggle() {
    const synthesis = window.speechSynthesis;
    if (!synthesis || !window.SpeechSynthesisUtterance) {
      setStatus('voice_no_speaker');
      return;
    }
    if (playing) {
      if (activeUtterance === current.current) {
        synthesis.cancel();
        activeUtterance = null;
      }
      current.current = null;
      setPlaying(false);
      setStatus('');
      return;
    }
    const voice = matchingVoice(synthesis.getVoices(), locale);
    if (!voice) {
      setStatus('voice_language_missing');
      return;
    }
    window.dispatchEvent(new Event('pathmap-stop-speech'));
    synthesis.cancel();
    const chunks = speechChunks(text);
    setPlaying(true);
    setStatus('');
    const speak = (index: number) => {
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      current.current = activeUtterance = utterance;
      utterance.lang = speechLanguages[locale];
      utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => {
        if (current.current !== utterance) return;
        if (activeUtterance === utterance && index + 1 < chunks.length) speak(index + 1);
        else {
          if (activeUtterance === utterance) activeUtterance = null;
          current.current = null;
          setPlaying(false);
        }
      };
      utterance.onerror = (event) => {
        if (current.current !== utterance) return;
        if (activeUtterance === utterance) activeUtterance = null;
        current.current = null;
        setPlaying(false);
        if (event.error !== 'canceled' && event.error !== 'interrupted') setStatus('voice_error');
      };
      try {
        synthesis.speak(utterance);
      } catch {
        current.current = activeUtterance = null;
        setPlaying(false);
        setStatus('voice_error');
      }
    };
    if (chunks.length) speak(0);
    else setPlaying(false);
  }
  return (
    <div className="assistant-read-aloud">
      <button
        type="button"
        className="button button-outline"
        onClick={toggle}
        aria-pressed={playing}
        disabled={disabled}
      >
        {t(playing ? 'voice_read_stop' : 'voice_read')}
      </button>
      {status && <p role="status">{t(status)}</p>}
    </div>
  );
}
