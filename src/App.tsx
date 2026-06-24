import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { LoginPage } from '@/pages/LoginPage';
import { CreateStudioPage } from '@/pages/CreateStudioPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { EnvBanner } from '@/components/EnvBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AlbumsPage = lazy(() => import('@/pages/AlbumsPage').then(m => ({ default: m.AlbumsPage })));
const CreateAlbumPage = lazy(() => import('@/pages/CreateAlbumPage').then(m => ({ default: m.CreateAlbumPage })));
const AlbumDetailPage = lazy(() => import('@/pages/AlbumDetailPage').then(m => ({ default: m.AlbumDetailPage })));
const EditAlbumPage = lazy(() => import('@/pages/EditAlbumPage').then(m => ({ default: m.EditAlbumPage })));
const ViewAlbumPage = lazy(() => import('@/pages/ViewAlbumPage').then(m => ({ default: m.ViewAlbumPage })));
const ReviewManagementPage = lazy(() => import('@/pages/ReviewManagementPage').then(m => ({ default: m.ReviewManagementPage })));
const ClientViewPage = lazy(() => import('@/pages/ClientViewPage').then(m => ({ default: m.ClientViewPage })));
const ReviewFeedbackPage = lazy(() => import('@/pages/ReviewFeedbackPage').then(m => ({ default: m.ReviewFeedbackPage })));
const AlbumUpdatePage = lazy(() => import('@/pages/AlbumUpdatePage').then(m => ({ default: m.AlbumUpdatePage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AlbumUnavailablePage = lazy(() => import('@/pages/AlbumUnavailablePage').then(m => ({ default: m.AlbumUnavailablePage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiePolicyPage = lazy(() => import('@/pages/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));

export default function App() {
  useAuth();
  return (
    <ErrorBoundary>
      <EnvBanner />
      <BrowserRouter>
        <Suspense fallback={<PageSpinner />}>
        <Routes>
        <Route index element={<LandingPage />} />

        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        <Route
          path={ROUTES.SIGNUP}
          element={
            <PublicRoute>
              <AuthLayout>
                <CreateStudioPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.ALBUMS} element={<AlbumsPage />} />
          <Route path={ROUTES.ALBUM_NEW} element={<CreateAlbumPage />} />
          <Route path={ROUTES.ALBUM_DETAIL} element={<AlbumDetailPage />} />
          <Route path={ROUTES.ALBUM_EDIT} element={<EditAlbumPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.REVIEW_MANAGEMENT} element={<ReviewManagementPage />} />
          <Route path={ROUTES.REVIEW_FEEDBACK} element={<ReviewFeedbackPage />} />
          <Route path={ROUTES.ALBUM_UPDATE} element={<AlbumUpdatePage />} />
        </Route>

        <Route path={ROUTES.CLIENT_VIEW} element={<ClientViewPage />} />

        <Route path={ROUTES.VIEW_ALBUM} element={<ViewAlbumPage />} />
        <Route path={ROUTES.REVIEW_ALBUM} element={<ViewAlbumPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        <Route path={ROUTES.ALBUM_UNAVAILABLE} element={<AlbumUnavailablePage />} />
        <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.TERMS} element={<TermsPage />} />
        <Route path={ROUTES.COOKIE_POLICY} element={<CookiePolicyPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
