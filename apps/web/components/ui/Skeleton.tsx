// Animated shimmer placeholder. The .skeleton utility class is defined
// in globals.css alongside the @keyframes shimmer.
type Variant = 'line' | 'block' | 'circle' | 'card';

const VARIANT_CLASSES: Record<Variant, string> = {
  line: 'h-3 rounded',
  block: 'h-24 rounded-lg',
  circle: 'rounded-lg',
  card: 'h-56 rounded-[10px]',
};

interface SkeletonProps {
  variant?: Variant;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  variant = 'line',
  className = '',
  width,
  height,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined)
    style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined)
    style.height = typeof height === 'number' ? `${height}px` : height;
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${VARIANT_CLASSES[variant]} ${className}`}
      style={style}
    />
  );
}
