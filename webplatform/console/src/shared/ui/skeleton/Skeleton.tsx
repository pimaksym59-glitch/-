import { clsx } from 'clsx';

/**
 * Skeleton (D2 §9/§16). A low-contrast shimmer block shaped like final content.
 * Reduced-motion collapses the shimmer to a static fill (themes.css).
 */
export interface SkeletonProps {
  readonly width?: string | number;
  readonly height?: string | number;
  readonly rounded?: 'sm' | 'md' | 'lg' | 'pill';
  readonly className?: string;
}

const RADIUS: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  pill: 'var(--radius-pill)',
};

export function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'md',
  className,
}: SkeletonProps): React.ReactElement {
  return (
    <span
      aria-hidden
      className={clsx('onyx-skeleton block', className)}
      style={{ width, height, borderRadius: RADIUS[rounded] }}
    />
  );
}
