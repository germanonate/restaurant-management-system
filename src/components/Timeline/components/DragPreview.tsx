import { memo } from 'react';
import { slotsToDuration } from '../utils/timeCalculations';
import { cn } from '@/lib/utils';

interface DragPreviewProps {
  left: number;
  top: number;
  width: number;
  height: number;
  type: 'create' | 'move' | 'resize';
  name?: string;
  startSlot: number | null;
  endSlot: number | null;
  hasConflict: boolean;
}

export const DragPreview = memo(function DragPreview({
  left,
  top,
  width,
  height,
  type,
  name,
  startSlot,
  endSlot,
  hasConflict,
}: DragPreviewProps) {
  return (
    <div
      className={cn(
        'absolute rounded-md pointer-events-none z-40 border-2',
        type === 'create' && 'border-dashed',
        hasConflict
          ? 'bg-red-200 border-red-500 shadow-lg shadow-red-500/30'
          : type === 'create'
            ? 'bg-blue-100 border-blue-500'
            : 'bg-[rgb(255,147,67)]/80 border-[rgb(255,147,67)] shadow-lg'
      )}
      style={{
        left,
        top: top + 4,
        width: Math.max(width, 40),
        height: height - 8,
        transform: 'translateZ(0)',
      }}
      aria-hidden="true"
    >
      {type === 'create' ? (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm font-medium',
            hasConflict ? 'text-red-700' : 'text-blue-700'
          )}
        >
          {startSlot !== null && endSlot !== null ? `${slotsToDuration(endSlot - startSlot)} min` : ''}
        </span>
      ) : (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm font-medium truncate px-2',
            hasConflict ? 'text-red-700' : 'text-white'
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
});
