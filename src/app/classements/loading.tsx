export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8">
      <div className="mb-8 h-12 w-64 rounded bg-muted" />
      <div className="h-10 rounded bg-muted" />
      <div className="mt-4 space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
