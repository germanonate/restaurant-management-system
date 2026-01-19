import { memo } from 'react';

interface VerticalGridLinesProps {
  lines: number[];
  height: number;
}

export const VerticalGridLines = memo(function VerticalGridLines({
  lines,
  height,
}: VerticalGridLinesProps) {
  return (
    <>
      {lines.map((x) => (
        <div
          key={`v-${x}`}
          className="absolute top-0 w-px bg-border pointer-events-none"
          style={{
            left: x,
            height,
            transform: 'translateZ(0)',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
});

interface HorizontalGridLinesProps {
  lines: number[];
  width: number;
}

export const HorizontalGridLines = memo(function HorizontalGridLines({
  lines,
  width,
}: HorizontalGridLinesProps) {
  return (
    <>
      {lines.map((y) => (
        <div
          key={`h-${y}`}
          className="absolute left-0 h-px bg-border pointer-events-none"
          style={{
            top: y,
            width,
            transform: 'translateZ(0)',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
});

interface SectorBackgroundsProps {
  headers: Array<{ id: string; y: number }>;
  width: number;
  height: number;
}

export const SectorBackgrounds = memo(function SectorBackgrounds({
  headers,
  width,
  height,
}: SectorBackgroundsProps) {
  return (
    <>
      {headers.map(({ id, y }) => (
        <div
          key={`sector-bg-${id}`}
          className="absolute left-0 bg-muted/50 pointer-events-none"
          style={{
            top: y,
            width,
            height,
            transform: 'translateZ(0)',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
});
