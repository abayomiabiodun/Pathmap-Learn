export default function Loading() {
  return (
    <div
      className="page-container loading-grid"
      role="status"
      aria-label="Loading your learning space"
    >
      <span className="sr-only">Loading…</span>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
