import { expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import en from '../messages/en.json';
import { Showcase } from '../src/components/showcase';
import * as api from '../src/lib/supabase/showcase';
import { emptyCircleState } from '../src/lib/supabase/community';
vi.mock('../src/lib/supabase/showcase', () => ({
  loadShowcase: vi.fn(),
  publishWork: vi.fn(),
  likeWork: vi.fn(),
  workComments: vi.fn(),
  commentWork: vi.fn(),
  loadWorkImage: vi.fn(),
  removeWork: vi.fn(),
  removeWorkComment: vi.fn(),
  reportWork: vi.fn(),
}));
const post = {
  id: 'work',
  nickname: 'Ada',
  kind: 'project' as const,
  title: 'My first page',
  body: 'I learned how headings describe a page.',
  url: 'https://example.com',
  has_image: false,
  image_alt: '',
  own: false,
  removed: false,
  liked: false,
  likes: 0,
  created_at: '2026-10-10T09:00:00Z',
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(api.loadShowcase).mockResolvedValue({
    community: {
      ...emptyCircleState,
      status: 'signed-in',
      circle: { id: 'circle', path: 'web', level: 'new', language: 'en', members: 2 },
    },
    posts: [post],
  });
  vi.mocked(api.workComments).mockResolvedValue([]);
});
function show() {
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Africa/Lagos">
      <Showcase />
    </NextIntlClientProvider>,
  );
}
it('publishes only with consent, then supports a like and a useful comment', async () => {
  const user = userEvent.setup();
  show();
  await screen.findByText(en.show_connected);
  await user.type(screen.getByLabelText(en.show_heading), 'My progress');
  await user.type(screen.getByLabelText(en.show_body), 'Today I made my first accessible page.');
  expect(screen.getByRole('button', { name: en.show_publish })).toBeDisabled();
  await user.click(screen.getByLabelText(en.show_consent));
  await user.click(screen.getByRole('button', { name: en.show_publish }));
  await waitFor(() =>
    expect(api.publishWork).toHaveBeenCalledWith(
      {
        kind: 'update',
        title: 'My progress',
        body: 'Today I made my first accessible page.',
        url: '',
      },
      null,
      '',
    ),
  );
  await user.click(screen.getByRole('button', { name: /^Like/ }));
  await waitFor(() => expect(api.likeWork).toHaveBeenCalledWith('work', true));
  await user.click(screen.getByRole('button', { name: en.show_comments }));
  await user.type(
    await screen.findByLabelText(en.show_comment),
    'Your headings make this easier to read.',
  );
  await user.click(screen.getByRole('button', { name: en.comm_send_reply }));
  await waitFor(() =>
    expect(api.commentWork).toHaveBeenCalledWith('work', 'Your headings make this easier to read.'),
  );
});
it('keeps disconnected drafts without pretending they were published', async () => {
  vi.mocked(api.loadShowcase).mockResolvedValue({ community: emptyCircleState, posts: [] });
  const user = userEvent.setup();
  show();
  await screen.findByText(en.show_disconnected);
  await user.type(screen.getByLabelText(en.show_heading), 'Saved draft');
  expect(JSON.parse(localStorage.getItem('pathmap-showcase-draft')!).title).toBe('Saved draft');
  expect(screen.getByRole('button', { name: en.show_publish })).toBeDisabled();
  expect(api.publishWork).not.toHaveBeenCalled();
});
