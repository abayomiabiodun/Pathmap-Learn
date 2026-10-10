'use client';
import { Button } from '@/components/ui/button';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="page-container empty-state">
      <h1>Let’s try that again.</h1>
      <p>Something interrupted this page. Your progress is still saved.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
