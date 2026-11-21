import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { ThemeProvider } from '../features/theme/index.js';
import { createQueryClient } from './queryClient.js';

const loadMotionFeatures = () => import('./motionFeatures.js').then((module) => module.default);

/**
 * Server state (TanStack Query), theme (Context) and motion settings.
 * `reducedMotion="user"` turns off transform and layout animations when the
 * operating system asks for reduced motion.
 */
export function AppProviders({ children, queryClient: providedClient }) {
  const [queryClient] = useState(() => providedClient ?? createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
