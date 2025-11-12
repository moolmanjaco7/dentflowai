// components/Skeleton.jsx
export default function SkeletonList({ rows = 4 }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-lg border p-3 bg-white">
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 w-56 rounded bg-slate-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
