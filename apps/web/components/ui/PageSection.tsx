import type { ReactNode } from 'react';

type Gap = 4 | 5 | 6 | 8;

interface PageSectionProps {
  gap?: Gap;
  children: ReactNode;
  testId?: string;
}

const GAP_CLASS: Record<Gap, string> = {
  4: 'space-y-4',
  5: 'space-y-5',
  6: 'space-y-6',
  8: 'space-y-8',
};

export default function PageSection({
  gap = 5,
  children,
  testId,
}: PageSectionProps) {
  return (
    <section data-testid={testId} className={GAP_CLASS[gap]}>
      {children}
    </section>
  );
}
