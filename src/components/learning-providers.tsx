'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { usePreferences } from './providers';
export function LearningProviders({ children }: { children: React.ReactNode }) {
  const { preferences } = usePreferences();
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion={preferences.lite ? 'always' : 'user'}>{children}</MotionConfig>
    </QueryClientProvider>
  );
}
