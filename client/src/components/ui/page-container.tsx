import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function PageContainer({ children, className, fullHeight = true }: PageContainerProps) {
  return (
    <div className={cn(
      "container mx-auto px-4 py-6",
      fullHeight && "min-h-[calc(100vh-4rem)]",
      className
    )}>
      {children}
    </div>
  );
}
