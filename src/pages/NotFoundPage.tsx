import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-primary p-6 safe-area-inset">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary">
        <FileQuestion className="h-10 w-10 text-text-muted" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">Page Not Found</h1>
      <p className="mt-2 text-sm text-text-secondary text-center max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to={ROUTES.LOGIN}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-bg-secondary px-5 py-3 text-sm font-medium text-text-primary hover:bg-bg-secondary/80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Go Home
      </Link>
    </div>
  );
}
