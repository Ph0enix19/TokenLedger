type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-teal-300 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-3 rounded-md bg-slate-800/90 ${className}`} />;
}

function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse border-b border-slate-800/70">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-3 py-3">
              <SkeletonLine className={columnIndex === 3 ? "w-full" : "w-20"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default TableSkeleton;
