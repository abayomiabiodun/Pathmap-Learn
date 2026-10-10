import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import en from '../messages/en.json';
import { Community } from '../src/components/community';
import * as api from '../src/lib/supabase/community';
vi.mock('../src/lib/supabase/community', async (original) => ({
  ...(await original<typeof import('../src/lib/supabase/community')>()),
  loadCircles: vi.fn(),
  joinCircle: vi.fn(),
  leaveCircle: vi.fn(),
  postMessage: vi.fn(),
  removePost: vi.fn(),
  reportPost: vi.fn(),
  mentorDirectory: vi.fn(),
  applyMentor: vi.fn(),
  requestGuidance: vi.fn(),
  sendGuidance: vi.fn(),
  proposeSession: vi.fn(),
  confirmSession: vi.fn(),
  closeGuidance: vi.fn(),
}));
let data: api.CircleState;
const profile = {
  nickname: 'Ada',
  path: 'web' as const,
  level: 'new' as const,
  language: 'en' as const,
};
const root = {
  id: 'root',
  parent: null,
  nickname: 'Peer',
  body: 'How do headings help readers navigate a page?',
  created_at: '2026-10-10T09:00:00Z',
  own: false,
  removed: false,
};
const mentor = {
  id: 'mentor',
  nickname: 'Guide',
  path: 'web',
  language: 'en',
  bio: 'I teach beginners to build accessible pages.',
};
beforeEach(() => {
  vi.clearAllMocks();
  data = {
    status: 'signed-in',
    profile,
    circle: { id: 'circle', path: 'web', level: 'new', language: 'en', members: 2 },
    posts: [
      root,
      { ...root, id: 'own', nickname: 'Ada', own: true, body: 'I made my first simple page.' },
      {
        ...root,
        id: 'reply',
        parent: 'root',
        nickname: 'Ada',
        own: true,
        body: 'Use headings to describe each section.',
      },
    ],
    mentor: null,
    guidance: [],
  };
  vi.mocked(api.loadCircles).mockImplementation(async () => structuredClone(data));
  vi.mocked(api.mentorDirectory).mockResolvedValue([mentor]);
});
function mount() {
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Africa/Lagos">
      <Community view="all" />
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}
const ready = () => screen.findByText(en.comm_connected);
it('keeps disconnected drafts on the device and gates account actions', async () => {
  vi.mocked(api.loadCircles).mockResolvedValue(api.emptyCircleState);
  const user = mount();
  await screen.findByText(en.comm_unconfigured);
  await user.type(screen.getByLabelText(en.comm_question), 'How can I structure my page?');
  expect(localStorage.getItem('pathmap-guidance-draft')).toBe('How can I structure my page?');
  expect(screen.getByRole('button', { name: en.comm_request })).toBeDisabled();
  expect(api.requestGuidance).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: en.comm_refresh }));
  expect(api.loadCircles).toHaveBeenCalledTimes(2);
});
it('requires explicit circle membership and validates profile before matching', async () => {
  data.profile = null;
  data.circle = null;
  data.posts = [];
  const user = mount();
  await ready();
  expect(screen.getByText(en.comm_join_first)).toBeVisible();
  await user.type(screen.getByLabelText(en.eng_nickname), 'x');
  await user.click(screen.getByRole('button', { name: en.comm_join }));
  expect(await screen.findByText(en.eng_invalid)).toBeVisible();
  expect(api.joinCircle).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText(en.eng_nickname));
  await user.type(screen.getByLabelText(en.eng_nickname), 'Adẹ́');
  await user.selectOptions(screen.getByLabelText(en.eng_path), 'data');
  await user.selectOptions(screen.getByLabelText(en.eng_level), 'basics');
  await user.selectOptions(screen.getByLabelText(en.learn_language), 'yo');
  await user.click(screen.getByRole('button', { name: en.comm_join }));
  await waitFor(() =>
    expect(api.joinCircle).toHaveBeenCalledWith({
      nickname: 'Adẹ́',
      path: 'data',
      level: 'basics',
      language: 'yo',
    }),
  );
});
it('posts plain text, focuses replies, cancels and reports another learner message', async () => {
  const user = mount();
  await ready();
  const input = screen.getByLabelText(en.comm_share);
  await user.type(input, 'short');
  await user.click(screen.getByRole('button', { name: en.comm_post }));
  expect(await screen.findByText(en.comm_invalid)).toBeVisible();
  await user.clear(input);
  await user.type(input, '<script>alert(1)</script>');
  await user.click(screen.getByRole('button', { name: en.comm_post }));
  await waitFor(() =>
    expect(api.postMessage).toHaveBeenCalledWith('<script>alert(1)</script>', null),
  );
  expect(input).toHaveValue('');
  await user.click(screen.getAllByRole('button', { name: en.comm_reply })[0]);
  expect(screen.getByLabelText(en.comm_reply)).toHaveFocus();
  await user.click(screen.getByRole('button', { name: en.eng_cancel }));
  await user.click(screen.getAllByRole('button', { name: en.comm_reply })[0]);
  await user.type(screen.getByLabelText(en.comm_reply), 'I can explain semantic page headings.');
  await user.click(screen.getByRole('button', { name: en.comm_post }));
  await waitFor(() =>
    expect(api.postMessage).toHaveBeenLastCalledWith(
      'I can explain semantic page headings.',
      'own',
    ),
  );
  await user.click(screen.getByRole('button', { name: en.comm_report }));
  await user.selectOptions(screen.getByLabelText(en.comm_report_reason), 'abuse');
  await user.click(screen.getByRole('button', { name: en.comm_submit_report }));
  await waitFor(() => expect(api.reportPost).toHaveBeenCalledWith('root', 'abuse'));
  await user.click(screen.getAllByRole('button', { name: en.comm_remove })[0]);
  await waitFor(() => expect(api.removePost).toHaveBeenCalled());
});
it('confirms leaving and removes peer access without automatic joining', async () => {
  vi.mocked(api.leaveCircle).mockImplementation(async () => {
    data.circle = null;
    data.posts = [];
  });
  const user = mount();
  await ready();
  await user.click(screen.getByRole('button', { name: en.comm_leave }));
  expect(api.leaveCircle).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: en.eng_cancel }));
  await user.click(screen.getByRole('button', { name: en.comm_leave }));
  await user.click(screen.getByRole('button', { name: en.comm_confirm_leave }));
  await screen.findByText(en.comm_join_first);
  expect(api.leaveCircle).toHaveBeenCalledTimes(1);
});
it('selects a mentor, submits the private question and requests approval separately', async () => {
  const user = mount();
  await ready();
  await user.type(
    screen.getByLabelText(en.comm_question),
    'How should I use meaningful link text?',
  );
  expect(api.requestGuidance).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: en.comm_choose_mentor }));
  expect(screen.getByLabelText(en.comm_question)).toHaveFocus();
  await user.click(screen.getByRole('button', { name: en.comm_request }));
  await waitFor(() =>
    expect(api.requestGuidance).toHaveBeenCalledWith(
      'mentor',
      'How should I use meaningful link text?',
    ),
  );
  expect(screen.getByLabelText(en.comm_question)).toHaveValue('');
  await user.type(screen.getByLabelText(en.comm_bio), 'short');
  await user.click(screen.getByRole('button', { name: en.comm_apply }));
  expect(api.applyMentor).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText(en.comm_bio));
  await user.type(
    screen.getByLabelText(en.comm_bio),
    'I help beginners practise accessible web development.',
  );
  await user.click(screen.getByRole('button', { name: en.comm_apply }));
  await waitFor(() =>
    expect(api.applyMentor).toHaveBeenCalledWith(
      'I help beginners practise accessible web development.',
    ),
  );
});
it('allows private follow-up, learner confirmation and closing', async () => {
  data.guidance = [
    {
      id: 'guidance',
      nickname: 'Guide',
      question: 'How should I structure my heading?',
      status: 'proposed',
      session_at: '2026-10-11T10:00:00Z',
      mentor_side: false,
      messages: [
        {
          id: 'message',
          body: 'Use a heading that describes the section.',
          own: false,
          created_at: '2026-10-10T10:00:00Z',
        },
        {
          id: 'mine',
          body: 'Thank you for your helpful explanation.',
          own: true,
          created_at: '2026-10-10T10:01:00Z',
        },
      ],
    },
  ];
  const user = mount();
  await ready();
  await user.click(screen.getByRole('button', { name: en.comm_confirm }));
  expect(api.confirmSession).toHaveBeenCalledWith('guidance');
  await user.type(screen.getByLabelText(en.comm_private_reply), 'short');
  await user.click(screen.getByRole('button', { name: en.comm_send_reply }));
  expect(await screen.findByText(en.comm_invalid)).toBeVisible();
  await user.clear(screen.getByLabelText(en.comm_private_reply));
  await user.type(
    screen.getByLabelText(en.comm_private_reply),
    'How should I describe navigation links?',
  );
  await user.click(screen.getByRole('button', { name: en.comm_send_reply }));
  await waitFor(() =>
    expect(api.sendGuidance).toHaveBeenCalledWith(
      'guidance',
      'How should I describe navigation links?',
    ),
  );
  await user.click(screen.getByRole('button', { name: en.comm_close }));
  expect(api.closeGuidance).toHaveBeenCalledWith('guidance');
});
it('lets a mentor propose a valid future session and displays closed conversations', async () => {
  data.mentor = { approved: true, bio: mentor.bio };
  data.guidance = [
    {
      id: 'guidance',
      nickname: 'Learner',
      question: 'How do headings work in HTML?',
      status: 'answered',
      session_at: null,
      mentor_side: true,
      messages: [],
    },
    {
      id: 'closed',
      nickname: 'Previous learner',
      question: 'Thanks for the guidance on links.',
      status: 'closed',
      session_at: null,
      mentor_side: true,
      messages: [],
    },
  ];
  const user = mount();
  await ready();
  expect(screen.queryByRole('button', { name: en.comm_apply })).not.toBeInTheDocument();
  const field = screen.getByLabelText(en.comm_propose);
  await user.type(field, '2020-10-11T10:00');
  await user.click(screen.getByRole('button', { name: en.comm_propose }));
  expect(await screen.findByText(en.comm_invalid)).toBeVisible();
  expect(api.proposeSession).not.toHaveBeenCalled();
  const future = new Date(Date.now() + 86400000);
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await user.clear(field);
  await user.type(field, local);
  await user.click(screen.getByRole('button', { name: en.comm_propose }));
  await waitFor(() =>
    expect(api.proposeSession).toHaveBeenCalledWith('guidance', new Date(local).toISOString()),
  );
  expect(screen.getByText(en.comm_status_closed)).toBeVisible();
});
it('handles connection, storage and submission failures without claiming success', async () => {
  vi.mocked(api.loadCircles).mockRejectedValueOnce(new Error('offline'));
  const user = mount();
  await screen.findByText(en.eng_error);
  expect(screen.getByRole('button', { name: en.comm_join })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: en.comm_refresh }));
  await ready();
  vi.mocked(api.postMessage).mockRejectedValueOnce(new Error('denied'));
  await user.type(screen.getByLabelText(en.comm_share), 'Please explain meaningful link text.');
  await user.click(screen.getByRole('button', { name: en.comm_post }));
  await screen.findByText(en.eng_error);
  expect(screen.getByLabelText(en.comm_share)).toHaveValue('Please explain meaningful link text.');
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  await user.type(screen.getByLabelText(en.comm_question), 'Question');
  expect(await screen.findByText(en.comm_storage_error)).toBeVisible();
  storage.mockRestore();
});
it('shows guest, empty board, removed posts and pending mentor states', async () => {
  data.status = 'guest';
  data.circle = null;
  data.profile = null;
  data.posts = [];
  data.mentor = null;
  vi.mocked(api.mentorDirectory).mockResolvedValue([]);
  const user = mount();
  await screen.findByText(en.comm_guest);
  expect(screen.getByRole('link', { name: en.ui_sign_in })).toHaveAttribute('href', '/auth');
  data.status = 'signed-in';
  data.profile = profile;
  data.circle = { id: 'circle', path: 'web', level: 'new', language: 'en', members: 1 };
  data.mentor = { approved: false, bio: mentor.bio };
  await user.click(screen.getByRole('button', { name: en.comm_refresh }));
  await screen.findByText(en.comm_empty_board);
  expect(screen.getByText(en.eng_pending)).toBeVisible();
  data.posts = [{ ...root, removed: true, body: '' }];
  await user.click(screen.getByRole('button', { name: en.comm_refresh }));
  expect(await screen.findByText(en.comm_removed)).toBeVisible();
  expect(screen.queryByRole('button', { name: en.comm_report })).not.toBeInTheDocument();
});
