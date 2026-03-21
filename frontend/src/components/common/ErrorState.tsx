export function ErrorState({ title = 'Failed to load', description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-soft">
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-2">{description}</p> : null}
    </div>
  );
}
