'use client';

import * as React from 'react';

interface ProgressProps {
  value?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value = 0,
  className = '',
  indicatorClassName = '',
}: ProgressProps) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full bg-blue-500 transition-all duration-300 ease-out ${indicatorClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
