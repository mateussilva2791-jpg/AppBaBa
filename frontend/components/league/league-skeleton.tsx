export function LeagueSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="skeleton-block h-56 rounded-3xl" />
        <div className="skeleton-block h-56 rounded-3xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="skeleton-block h-80 rounded-3xl" />
        <div className="skeleton-block h-80 rounded-3xl" />
      </div>
      <div className="skeleton-block h-48 rounded-3xl" />
    </div>
  );
}
