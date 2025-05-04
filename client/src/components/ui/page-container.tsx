import { cn } from '@/lib/utils';
import type React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function PageContainer({ children, className, fullHeight = true }: PageContainerProps) {
  return (
    <div
      className={cn(
        'container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
        fullHeight && 'min-h-[calc(100vh-4rem)]',
        className
      )}
    >
      {children}
    </div>
  );
}
