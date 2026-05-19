import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
    variants: {
        variant: {
            default: 'bg-neutral-900 text-white hover:bg-neutral-800',
            outline: 'border border-neutral-300 bg-white hover:bg-neutral-50',
            ghost: 'hover:bg-neutral-100',
            destructive: 'bg-red-600 text-white hover:bg-red-700',
        },
        size: {
            default: 'h-9 px-4 py-2',
            sm: 'h-8 px-3 text-xs',
            icon: 'h-9 w-9',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});
const Button = forwardRef(({ className, variant, size, ...props }, ref) => (_jsx("button", { className: cn(buttonVariants({ variant, size, className })), ref: ref, ...props })));
Button.displayName = 'Button';
export { Button, buttonVariants };
