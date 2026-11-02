// Text logo until there is a real one
export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-semibold tracking-tight text-primary ${className}`}>Temerelle</span>;
}
