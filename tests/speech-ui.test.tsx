import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ReadAloud, SpeechInput } from '../src/components/assistant-speech';
import type { Recognition } from '../src/lib/speech';
import en from '../messages/en.json';

afterEach(() => vi.unstubAllGlobals());
const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
it('dictates without sending, uses the requested locale, preserves the draft and stops on unmount', () => {
  const instances: Recognition[] = [];
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart = null;
    onend = null;
    onerror = null;
    onresult = null;
    constructor() {
      instances.push(this);
    }
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
  }
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
  const change = vi.fn();
  const listening = vi.fn();
  const view = wrap(
    <SpeechInput locale="yo" value="My draft" onChange={change} onListening={listening} />,
  );
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: en.voice_mic }));
  expect(instances[0].lang).toBe('yo-NG');
  act(() => instances[0].onstart?.());
  act(() => instances[0].onresult?.({ results: [{ isFinal: false, 0: { transcript: 'HTML' } }] }));
  expect(change).not.toHaveBeenCalled();
  act(() => instances[0].onresult?.({ results: [{ isFinal: true, 0: { transcript: 'HTML' } }] }));
  expect(change).toHaveBeenCalledWith('My draft HTML');
  fireEvent.click(screen.getByRole('button', { name: en.voice_mic_stop }));
  expect(instances[0].stop).toHaveBeenCalled();
  view.unmount();
  expect(instances[0].abort).toHaveBeenCalled();
  expect(instances[0].onresult).toBeNull();
});
it('handles unsupported recognition and denied microphone access', () => {
  const view = wrap(<SpeechInput locale="en" value="" onChange={vi.fn()} onListening={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: en.voice_mic }));
  expect(screen.getByRole('status')).toHaveTextContent(en.voice_no_mic);
  view.unmount();
  const instances: Recognition[] = [];
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart = null;
    onend = null;
    onerror = null;
    onresult = null;
    constructor() {
      instances.push(this);
    }
    start() {}
    stop() {}
    abort() {}
  }
  vi.stubGlobal('SpeechRecognition', FakeRecognition);
  wrap(<SpeechInput locale="en" value="" onChange={vi.fn()} onListening={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: en.voice_mic }));
  act(() => instances[0].onerror?.({ error: 'not-allowed' }));
  expect(screen.getByRole('status')).toHaveTextContent(en.voice_denied);
  expect(screen.getByRole('button', { name: en.voice_mic })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
it('reads and stops a matching voice, and reports a missing language without speaking English', () => {
  class Utterance {
    text: string;
    lang = '';
    voice = null;
    rate = 1;
    onend = null;
    onerror = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const speak = vi.fn();
  const cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'fr-FR' }], speak, cancel });
  const view = wrap(<ReadAloud locale="fr" text="Bonjour" />);
  fireEvent.click(screen.getByRole('button', { name: en.voice_read }));
  expect(speak.mock.calls[0][0]).toMatchObject({
    text: 'Bonjour',
    lang: 'fr-FR',
    voice: { lang: 'fr-FR' },
  });
  fireEvent.click(screen.getByRole('button', { name: en.voice_read_stop }));
  expect(cancel).toHaveBeenCalledTimes(2);
  view.unmount();
  wrap(<ReadAloud locale="ig" text="Ndewo" />);
  fireEvent.click(screen.getByRole('button', { name: en.voice_read }));
  expect(screen.getByRole('status')).toHaveTextContent(en.voice_language_missing);
  expect(speak).toHaveBeenCalledTimes(1);
});

it('stops the earlier reader even when browser cancellation does not emit events', () => {
  class Utterance {
    text: string;
    lang = '';
    voice = null;
    rate = 1;
    onend = null;
    onerror = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [{ lang: 'en-NG' }],
    speak: vi.fn(),
    cancel: vi.fn(),
  });
  wrap(
    <>
      <ReadAloud locale="en" text="First answer" />
      <ReadAloud locale="en" text="Second answer" />
    </>,
  );
  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[0]);
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(buttons[1]);
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
});
