export default function SkeletonCard() {
  return (
    <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-fade-in sm:mt-8 sm:p-5 lg:p-6">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:gap-6">
        <div className="w-full min-w-0 lg:w-[55%]">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 lg:w-[45%]">
          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-3 w-20 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-12 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
