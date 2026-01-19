import { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  position: 'left' | 'right';
  isCancelled: boolean;
}

export const ResizeHandle = memo(function ResizeHandle({
  position,
  isCancelled,
}: ResizeHandleProps) {
  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center',
        position === 'left' ? 'left-0' : 'right-0'
      )}
      aria-hidden="true"
    >
      <GripVertical
        className={cn('h-4 w-4', isCancelled ? 'text-gray-600' : 'text-white/70')}
      />
    </div>
  );
});
