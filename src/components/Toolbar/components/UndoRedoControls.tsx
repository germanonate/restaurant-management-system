import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UndoRedoControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  iconSize?: 'sm' | 'md';
}

export function UndoRedoControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  iconSize = 'md',
}: UndoRedoControlsProps) {
  const iconClassName = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const buttonSize = iconSize === 'sm' ? 'h-8 w-8' : undefined;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={iconSize === 'sm' ? 'icon' : undefined}
              className={buttonSize}
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <Undo2 className={iconClassName} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={iconSize === 'sm' ? 'icon' : undefined}
              className={buttonSize}
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 className={iconClassName} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
