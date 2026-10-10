export default function Page() {
  return (
    <article className="page-container narrow">
      <span className="eyebrow">YOUR LEARNING, YOUR CHOICE</span>
      <h1>Privacy comes first.</h1>
      <h2>What we store</h2>
      <p>
        PathMap Learn uses your quiz answers, learning progress and preferences to tailor your
        learning. In the local demo, preferences are stored on your device. When live accounts are
        configured, your email and learning records are held in Supabase.
      </p>
      <h2>You control your visibility</h2>
      <p>
        Public portfolios, recruiter visibility and leaderboards are opt-in. We never send email,
        SMS or WhatsApp reminders without your recorded permission.
      </p>
      <h2>Your data rights</h2>
      <p>
        You can request an export or deletion of your account data through settings when signed in.
        Clearing this site’s browser storage removes local demo data. Sign-in links are handled by
        Supabase; Google sign-in shares the profile information you approve.
      </p>
      <h2>Offline learning</h2>
      <p>
        Saved lessons may be cached on this device. Avoid saving personal information on a shared
        device and remove downloads when you finish using it.
      </p>
      <h2>Third-party learning resources</h2>
      <p>
        External learning providers have their own privacy policies. Opening a resource takes you to
        that provider’s website. PathMap does not load videos until you choose to open them.
      </p>
    </article>
  );
}
