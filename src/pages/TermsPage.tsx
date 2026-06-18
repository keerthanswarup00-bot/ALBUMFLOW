import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 safe-area-inset">
      <Link
        to={ROUTES.HOME}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      
      <h1 className="text-3xl font-bold text-text-primary mb-8">Terms of Service</h1>
      
      <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
        <p>Last updated: June 2026</p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">1. Acceptance of Terms</h2>
        <p>
          By accessing or using AlbumFlow, you agree to be bound by these Terms of Service.
          If you do not agree, you may not use the service.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">2. Description of Service</h2>
        <p>
          AlbumFlow provides a platform for photographers and designers to share album proofs
          with clients, collect feedback, and manage the album revision process.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">3. User Responsibilities</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials,
          for all activity that occurs under your account, and for ensuring that any content
          you upload does not violate any laws or third-party rights.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">4. Intellectual Property</h2>
        <p>
          You retain all rights to the content you upload. By uploading content, you grant
          AlbumFlow a limited license to store, display, and process that content solely for
          the purpose of providing the service.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">5. Limitation of Liability</h2>
        <p>
          AlbumFlow is provided "as is" without warranty of any kind. We shall not be liable
          for any damages arising from your use of the service.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">6. Termination</h2>
        <p>
          We reserve the right to suspend or terminate access to AlbumFlow for violations of
          these terms or for any other reason at our discretion.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">7. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. Continued use of AlbumFlow after changes
          constitutes acceptance of the new terms.
        </p>
      </div>
    </div>
  );
}
