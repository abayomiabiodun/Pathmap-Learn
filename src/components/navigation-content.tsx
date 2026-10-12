// Static navigation data and artwork are passed from the server layout.
export const navigationLinks = [
  ['/', 'home'],
  ['/quiz', 'start'],
  ['/quiz?skip=true', 'ui_i_already_know_my_path'],
  ['/taster', 'taster_try'],
  ['/learn', 'eng_continue'],
  ['/assistant', 'assistant_label'],
  ['/library', 'library'],
  ['/paths', 'ui_explore_all_10_paths'],
  ['/dashboard', 'eng_streak'],
  ['/circles', 'comm_title'],
  ['/circles/join', 'comm_join'],
  ['/circles/check-in', 'comm_checkin'],
  ['/circles/mentors', 'comm_mentors'],
  ['/circles/become-mentor', 'comm_become_mentor'],
  ['/showcase', 'show_title'],
  ['/recruiter', 'eng_recruiter'],
  ['/auth', 'signIn'],
  ['/privacy', 'privacy'],
] as const;
export const menuIcon = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const closeIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
export const themeIcon = (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path className="theme-moon" d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
    <g className="theme-sun">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </g>
  </svg>
);
