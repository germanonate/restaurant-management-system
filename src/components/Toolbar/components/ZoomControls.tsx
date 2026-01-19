import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canZoomIn, canZoomOut } from '../constants/toolbarConstants';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  iconSize?: 'sm' | 'md';
}

export function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  iconSize = 'md',
}: ZoomControlsProps) {
  const iconClassName = iconSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const buttonSize = iconSize === 'sm' ? 'h-8 w-8' : undefined;
  const textSize = iconSize === 'sm' ? 'text-xs w-8' : 'text-sm w-12';

  return (
    <div className={`flex items-center ${iconSize === 'sm' ? 'gap-1' : 'gap-2'}`}>
      <Button
        variant="outline"
        size={iconSize === 'sm' ? 'icon' : 'icon'}
        className={buttonSize}
        onClick={onZoomOut}
        disabled={!canZoomOut(zoomLevel)}
        aria-label="Zoom out"
      >
        <ZoomOut className={iconClassName} />
      </Button>
      <span className={`font-medium text-center ${textSize}`}>{zoomLevel}%</span>
      <Button
        variant="outline"
        size={iconSize === 'sm' ? 'icon' : 'icon'}
        className={buttonSize}
        onClick={onZoomIn}
        disabled={!canZoomIn(zoomLevel)}
        aria-label="Zoom in"
      >
        <ZoomIn className={iconClassName} />
      </Button>
    </div>
  );
}
