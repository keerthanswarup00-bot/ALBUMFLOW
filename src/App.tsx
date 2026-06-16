import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AlbumsPage } from '@/pages/AlbumsPage';
import { CreateAlbumPage } from '@/pages/CreateAlbumPage';
import { AlbumDetailPage } from '@/pages/AlbumDetailPage';
import { EditAlbumPage } from '@/pages/EditAlbumPage';
import { ViewAlbumPage } from '@/pages/ViewAlbumPage';
import { ReviewManagementPage } from '@/pages/ReviewManagementPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { useAuth } from '@/hooks/useAuth';

export default function App() {
  useAuth();
  return (
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
          <Route path={ROUTES.ALBUM_VIEWER} element={<ViewAlbumPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.REVIEW_MANAGEMENT} element={<ReviewManagementPage />} />
        </Route>

        <Route path={ROUTES.VIEW_ALBUM} element={<ViewAlbumPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
