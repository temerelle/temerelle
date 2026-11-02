import Link from "next/link";
import { PageLayout } from "@/components/ui/PageLayout";

// Also for notFound() calls; rendered inside the root layout
export default function NotFound() {
  return (
    <PageLayout className="items-center text-center">
      <p className="font-semibold text-4xl text-primary mb-2">404</p>
      <h1 className="text-2xl mb-8">Сторінку не знайдено</h1>
      <div className="w-full max-w-xs mx-auto">
        <Link href="/" className="btn-primary block w-full py-4 rounded-lg font-medium transition-colors text-center">
          На головну
        </Link>
      </div>
    </PageLayout>
  );
}
