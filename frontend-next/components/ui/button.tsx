import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-full font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-[#3B82F6] text-white hover:bg-[#2563EB] focus-visible:ring-[#3B82F6]',
      secondary: 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] focus-visible:ring-[#8B5CF6]',
      outline: 'border-2 border-[#3B82F6] bg-white text-[#3B82F6] hover:bg-[#EFF6FF] focus-visible:ring-[#3B82F6]',
      ghost: 'bg-transparent text-[#64748B] hover:bg-slate-100 focus-visible:ring-slate-400 shadow-none',
    };

    const sizes = {
      default: 'h-11 px-6 py-2.5 text-sm',
      sm: 'h-9 px-4 text-sm',
      lg: 'h-12 px-8 text-base',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
