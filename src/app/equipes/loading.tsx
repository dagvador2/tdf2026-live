export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8">
      <div className="mb-8 h-12 w-48 rounded bg-muted" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
