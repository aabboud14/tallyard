// Loading placeholders with a slow shimmer (still under reduced motion).
import { cx } from './cx'

export function Skeleton({ className, shape = 'rect' }: { className?: string; shape?: 'rect' | 'circle' | 'text' }) {
  return <div aria-hidden="true" className={cx('skeleton', shape === 'circle' ? 'rounded-full' : shape === 'text' ? 'h-3.5 rounded' : 'rounded-md', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4']
  return (
    <div aria-hidden="true" className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="text" className={i === lines - 1 ? 'w-1/2' : widths[i % widths.length]} />
      ))}
    </div>
  )
}

/** The shape of a material card while it loads. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cx('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton shape="text" className="h-4 w-3/4" />
        <Skeleton shape="text" className="w-1/2" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}
