import type { Metadata } from 'next';
import { Taster } from '@/components/taster';
export const metadata: Metadata = { title: 'Try your path' };
export default function Page() {
  return <Taster />;
}
