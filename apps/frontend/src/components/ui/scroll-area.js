import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
const ScrollArea = forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('overflow-auto', className), ...props })));
ScrollArea.displayName = 'ScrollArea';
export { ScrollArea };
