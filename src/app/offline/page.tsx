import Link from 'next/link';
import { WifiOff } from 'lucide-react';
export default function Page() {
  return (
    <div className="page-container empty-state">
      <WifiOff size={40} />
      <h1>A pause in connection. Keep your momentum.</h1>
      <p>Open your saved lessons or reconnect to discover something new.</p>
      <Link href="/library" className="button button-primary">
        Open my library
      </Link>
    </div>
  );
}
