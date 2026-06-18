import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 safe-area-inset">
      <Link
        to={ROUTES.HOME}
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      
      <h1 className="text-3xl font-bold text-text-primary mb-8">Cookie Policy</h1>
      
      <div className="prose prose-sm max-w-none text-text-secondary space-y-6">
        <p>Last updated: June 2026</p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          websites remember your preferences and improve your browsing experience.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">2. How We Use Cookies</h2>
        <p>
          AlbumFlow uses cookies for essential functionality, including authentication (keeping
          you signed in), security (protecting against abuse), and preference storage (remembering
          your theme and language settings).
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">3. Types of Cookies We Use</h2>
        <p>
          <strong>Essential Cookies:</strong> Required for the service to function. These cannot
          be disabled. They include session tokens and CSRF protection cookies.
        </p>
        <p>
          <strong>Preference Cookies:</strong> Remember your settings such as theme preference
          and language selection.
        </p>
        <p>
          <strong>Analytics Cookies:</strong> Help us understand how AlbumFlow is used so we
          can improve it. These are anonymized and do not identify you personally.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">4. Third-Party Cookies</h2>
        <p>
          We may use third-party services (such as Supabase for authentication) that set their
          own cookies. These services have their own cookie policies.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">5. Managing Cookies</h2>
        <p>
          Most web browsers allow you to control cookies through their settings. You can block
          or delete cookies, but doing so may affect the functionality of AlbumFlow.
        </p>

        <h2 className="text-xl font-semibold text-text-primary mt-8">6. Contact</h2>
        <p>
          If you have questions about our use of cookies, please contact your photography studio
          or reach out to us at support@albumflow.app.
        </p>
      </div>
    </div>
  );
}
