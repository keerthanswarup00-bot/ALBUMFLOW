import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 safe-area-inset">
      <Link
        to={ROUTES.HOME}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      
      <h1 className="text-3xl font-bold text-text-primary mb-8">Privacy Policy</h1>
      
      <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
        <p>Last updated: June 2026</p>
        
        <h2 className="text-xl font-semibold text-text-primary mt-8">1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, including account registration details
          (name, email address, studio/business name), album content and images you upload,
          and communications you send to us.
        </p>
        <p>
          We automatically collect certain information when you use AlbumFlow, including your
          IP address, browser type, device information, and usage data such as pages viewed
          and features used.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve AlbumFlow, to
          process your transactions, to send you technical notices and support messages, and
          to respond to your comments and questions.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">3. Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share your information with third-party
          service providers who help us operate AlbumFlow (such as cloud storage providers and
          content delivery networks), when required by law, or with your consent.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">4. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide
          you services. You may request deletion of your account and associated data at any time.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">5. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access, correct, or delete
          your personal information, to restrict or object to processing, and to data portability.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">6. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact your photography studio
          or reach out to us at support@albumflow.app.
        </p>
      </div>
    </div>
  );
}
