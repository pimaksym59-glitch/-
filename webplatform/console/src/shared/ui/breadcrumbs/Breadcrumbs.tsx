import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs (D2 §13.9 / D1 §6.6). Never more than three crumbs — deeper
 * context belongs in the Inspector, not another page level. The last crumb is
 * the current page and is not a link (`aria-current="page"`).
 *
 * Presentational on purpose (plain anchors): keeps `shared/ui` free of routing
 * imports so it renders in isolation. **Formalized in FS3.**
 */
export interface Crumb {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbsProps {
  readonly items: readonly Crumb[];
  readonly className?: string;
}

const MAX_CRUMBS = 3;

export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.ReactElement | null {
  if (items.length === 0) return null;
  const visible = items.length > MAX_CRUMBS ? items.slice(items.length - MAX_CRUMBS) : items;

  return (
    <nav aria-label="Breadcrumb" className={clsx('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm text-secondary">
        {visible.map((crumb, index) => {
          const isLast = index === visible.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-tertiary" />
              ) : null}
              {isLast || !crumb.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={clsx('truncate', isLast && 'text-primary')}
                  title={crumb.label}
                >
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.href}
                  className="truncate transition-colors hover:text-primary"
                  title={crumb.label}
                >
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
