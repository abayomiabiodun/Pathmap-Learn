import { KnownPath, Quiz } from '@/components/quiz';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ skip?: string | string[] }>;
}) {
  const params = await searchParams;
  return params.skip === 'true' ? <KnownPath /> : <Quiz />;
}
