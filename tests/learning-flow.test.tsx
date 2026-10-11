import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Learning } from '@/components/learning';
import { lessonIds } from '@/lib/learning';
import en from '../messages/en.json';
import yo from '../messages/yo.json';
import lessons from '../public/lessons/en.json';
import yoruba from '../public/lessons/yo.json';

afterEach(() => vi.restoreAllMocks());
it('renders server-provided lessons immediately without a second English content request', () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Learning path="web" initialLessons={lessons} />
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole('heading', { name: lessons.html.title })).toBeVisible();
  expect(fetch.mock.calls.every(([input]) => !String(input).startsWith('/lessons/'))).toBe(true);
});
function app(path?: 'web' | 'data') {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => lessons,
  } as Response);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Learning path={path} />
    </NextIntlClientProvider>,
  );
}
it('requires practice and a correct check, saves drafts and completes all web lessons', async () => {
  app('web');
  await screen.findByRole('heading', { name: lessons.html.title });
  fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
  expect(screen.getByText(en.learn_required)).toBeVisible();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'My HTML page has a heading, a paragraph and a link.' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'False' }));
  fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
  expect(screen.getByText(en.learn_incorrect)).toBeVisible();
  fireEvent.click(screen.getByRole('radio', { name: 'True' }));
  fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
  expect(screen.getByText(en.learn_success)).toBeVisible();
  expect(screen.getByRole('heading', { name: lessons.html.title })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.learn_next }));
  for (const [answer, text] of [
    ['False', 'I added colour and padding. Flexible widths fit phones.'],
    ['True', 'My click listener changes textContent on the paragraph.'],
  ]) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
    fireEvent.click(screen.getByRole('radio', { name: answer }));
    fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
    if (answer === 'False') fireEvent.click(screen.getByRole('button', { name: en.learn_next }));
  }
  for (const id of lessonIds.web.slice(3)) {
    fireEvent.click(screen.getByRole('button', { name: en.learn_next }));
    const lesson = lessons[id as keyof typeof lessons];
    expect(screen.getByRole('heading', { name: lesson.title })).toBeVisible();
    fireEvent.change(screen.getByRole('textbox'), {
      target: {
        value: `My practice for ${lesson.title}: I tested an example and explained my decision.`,
      },
    });
    fireEvent.click(
      screen.getByRole('radio', { name: lesson.answer ? en.learn_true : en.learn_false }),
    );
    fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
  }
  expect(screen.getByText(en.learn_finished)).toBeVisible();
  const saved = JSON.parse(localStorage.getItem('pathmap-learning-v1')!);
  expect(
    Object.values(saved.lessons).every((value) => (value as { completed: boolean }).completed),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /1\. Build your first HTML page/ }));
  expect(screen.getByRole('textbox')).toHaveValue(
    'My HTML page has a heading, a paragraph and a link.',
  );
});
it('restores unfinished drafts, keeps course progress separate and lists courses', async () => {
  localStorage.setItem(
    'pathmap-learning-v1',
    JSON.stringify({
      version: 1,
      lessons: {
        'web/html': { draft: 'finished HTML', completed: true },
        'web/css': { draft: 'my unfinished CSS practice', completed: false },
      },
    }),
  );
  const view = app('web');
  await screen.findByRole('heading', { name: lessons.css.title });
  expect(screen.getByRole('textbox')).toHaveValue('my unfinished CSS practice');
  view.unmount();
  app();
  expect(screen.getAllByRole('link', { name: en.learn_open })).toHaveLength(10);
  expect(screen.getByText('1 of 10 lessons completed')).toBeVisible();
});
it('shows recoverable loading errors and does not claim progress when storage fails', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).startsWith('/lessons/')) throw new Error('Offline');
    return { ok: true } as Response;
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Learning path="data" />
    </NextIntlClientProvider>,
  );
  await screen.findByText(en.learn_load_error);
  fetch.mockResolvedValue({ ok: true, json: async () => lessons } as Response);
  fireEvent.click(screen.getByRole('button', { name: en.learn_retry }));
  await screen.findByRole('heading', { name: lessons.data.title });
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'The average is 20 sales. I need more context.' },
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Full');
  });
  fireEvent.click(screen.getByRole('radio', { name: 'True' }));
  fireEvent.click(screen.getByRole('button', { name: en.learn_complete }));
  expect(screen.getByRole('alert')).toHaveTextContent(en.learn_save_error);
  expect(screen.queryByText(en.learn_success)).not.toBeInTheDocument();
});
it('replaces lesson content when the learning language changes', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input) =>
      ({
        ok: true,
        json: async () => (String(input).includes('/yo.') ? yoruba : lessons),
      }) as Response,
  );
  const view = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Learning path="web" />
    </NextIntlClientProvider>,
  );
  await screen.findByRole('heading', { name: lessons.html.title });
  view.rerender(
    <NextIntlClientProvider locale="yo" messages={yo}>
      <Learning path="web" />
    </NextIntlClientProvider>,
  );
  await screen.findByRole('heading', { name: yoruba.html.title });
  expect(screen.getByText(yoruba.html.practice)).toBeVisible();
});
it('returns to the server-provided English lessons after changing language', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => yoruba,
  } as Response);
  const view = render(
    <NextIntlClientProvider locale="yo" messages={yo}>
      <Learning path="web" initialLessons={lessons} />
    </NextIntlClientProvider>,
  );
  await screen.findByRole('heading', { name: yoruba.html.title });
  view.rerender(
    <NextIntlClientProvider locale="en" messages={en}>
      <Learning path="web" initialLessons={lessons} />
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole('heading', { name: lessons.html.title })).toBeVisible();
});
