import Link from 'next/link';
import { Compass } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="page-container empty-state">
      <Compass size={42} />
      <h1>A little off the path.</h1>
      <p>We couldn’t find this page. Let’s get you back to your journey.</p>
      <Link className="button button-primary" href="/">
        Back to home
      </Link>
    </div>
  );
}
