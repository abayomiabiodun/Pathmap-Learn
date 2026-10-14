import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test('dictates and reads replies using each selected language with browser speech APIs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { recognized: [] as string[], spoken: [] as string[], canceled: 0 };
    Object.assign(window, { voiceTest: state });
    class Recognition {
      lang = '';
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      start() {
        state.recognized.push(this.lang);
        this.onstart?.();
        this.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'HTML' } }] });
        this.onend?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    class Utterance {
      text: string;
      lang = '';
      voice = null;
      rate = 1;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: Utterance,
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () =>
          ['en-NG', 'pcm-NG', 'yo-NG', 'ha-NG', 'ig-NG', 'fr-FR'].map((lang) => ({ lang })),
        speak: (utterance: Utterance) => state.spoken.push(utterance.lang),
        cancel: () => {
          state.canceled++;
        },
      },
      configurable: true,
    });
  });
  await page.goto('/assistant');
  const tags: Record<string, string> = {
    en: 'en-NG',
    pcm: 'pcm-NG',
    yo: 'yo-NG',
    ha: 'ha-NG',
    ig: 'ig-NG',
    fr: 'fr-FR',
  };
  for (const [locale, tag] of Object.entries(tags)) {
    const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));
    await page.locator('.assistant-controls select').first().selectOption(locale);
    await page.getByRole('button', { name: messages.voice_mic, exact: true }).click();
    await expect(page.getByRole('textbox')).toHaveValue('HTML');
    await page.getByRole('button', { name: messages.assistant_send, exact: true }).click();
    const turn = page.getByRole('log').locator('article').last();
    await turn.getByRole('button', { name: messages.voice_read, exact: true }).click();
    await expect(
      turn.getByRole('button', { name: messages.voice_read_stop, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { voiceTest: { recognized: string[]; spoken: string[] } }
        ).voiceTest.recognized.at(-1),
      ),
    ).toBe(tag);
    expect(
      await page.evaluate(() =>
        (window as unknown as { voiceTest: { spoken: string[] } }).voiceTest.spoken.at(-1),
      ),
    ).toBe(tag);
    await turn.getByRole('button', { name: messages.voice_read_stop, exact: true }).click();
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('typing remains available when browser speech APIs are unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
  });
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Speak my question', exact: true }).click();
  await expect(
    page.getByText('This browser does not support dictation. You can still type your question.'),
  ).toBeVisible();
  await page.getByRole('textbox').fill('HTML');
  await page.getByRole('button', { name: 'Ask assistant', exact: true }).click();
  await page.getByRole('button', { name: 'Read answer aloud', exact: true }).click();
  await expect(page.getByText('Read-aloud is not available in this browser.')).toBeVisible();
});
