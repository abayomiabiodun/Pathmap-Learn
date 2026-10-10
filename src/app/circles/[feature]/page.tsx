import { notFound } from 'next/navigation';
import { Community } from '@/components/community';
import '../../dashboard/engagement.css';
import '../community.css';
const features = ['join', 'check-in', 'mentors', 'become-mentor'] as const;
export function generateStaticParams() {
  return features.map((feature) => ({ feature }));
}
export default async function Page({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const view = features.find((value) => value === feature);
  if (!view) notFound();
  return <Community view={view} />;
}
