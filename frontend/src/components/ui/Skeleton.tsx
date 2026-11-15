import React from 'react';
import { cn } from '@/utils/cn';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-lg bg-muted motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';
