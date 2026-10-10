import { notFound } from 'next/navigation';
import { LearningAccess } from '@/components/learning-access';
import { lessonIds, validPath, type Lesson } from '@/lib/learning';
import { pathIds } from '@/lib/quiz';
import english from '../../../../public/lessons/en.json';
import '../learning.css';
export function generateStaticParams() {
  return pathIds.map((path) => ({ path }));
}
export default async function Page({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!validPath(path)) notFound();
  const content = english as Record<string, Lesson>;
  const initialLessons = Object.fromEntries(lessonIds[path].map((id) => [id, content[id]]));
  return <LearningAccess key={path} path={path} initialLessons={initialLessons} />;
}
