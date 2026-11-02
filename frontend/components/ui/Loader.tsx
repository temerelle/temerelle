export function Loader({ label = "Завантаження" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center space-y-3">
      <span className="h-8 w-8 rounded-full border-2 border-line border-t-primary animate-spin motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
