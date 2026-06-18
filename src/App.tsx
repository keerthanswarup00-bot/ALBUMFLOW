import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { LoginPage } from '@/pages/LoginPage';
import { CreateStudioPage } from '@/pages/CreateStudioPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AlbumsPage } from '@/pages/AlbumsPage';
import { CreateAlbumPage } from '@/pages/CreateAlbumPage';
import { AlbumDetailPage } from '@/pages/AlbumDetailPage';
import { EditAlbumPage } from '@/pages/EditAlbumPage';
import { ViewAlbumPage } from '@/pages/ViewAlbumPage';
import { ReviewManagementPage } from '@/pages/ReviewManagementPage';
import { ClientViewPage } from '@/pages/ClientViewPage';
import { ReviewFeedbackPage } from '@/pages/ReviewFeedbackPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AlbumUnavailablePage } from '@/pages/AlbumUnavailablePage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';
import { CookiePolicyPage } from '@/pages/CookiePolicyPage';
import { useAuth } from '@/hooks/useAuth';
import { EnvBanner } from '@/components/EnvBanner';

export default function App() {
  useAuth();
  return (
    <>
      <EnvBanner />
      <BrowserRouter>
        <Routes>
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
        </Route>

        <Route path={ROUTES.CLIENT_VIEW} element={<ClientViewPage />} />

        <Route path={ROUTES.VIEW_ALBUM} element={<ViewAlbumPage />} />
        <Route path={ROUTES.REVIEW_ALBUM} element={<ViewAlbumPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        <Route path={ROUTES.ALBUM_UNAVAILABLE} element={<AlbumUnavailablePage />} />
        <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.TERMS} element={<TermsPage />} />
        <Route path={ROUTES.COOKIE_POLICY} element={<CookiePolicyPage />} />

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
