import { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import * as profileService from '@/services/supabase/profiles';
import { uploadStudioLogo } from '@/services/supabase/storage';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import type { User, Profile } from '@/types';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function ProfilePage() {
  const { user, profile, loadProfile } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted dark:text-text-muted" />
      </div>
    );
  }

  return <ProfileForm key={profile.user_id} user={user} profile={profile} loadProfile={loadProfile} showToast={showToast} />;
}

function ProfileForm({
  user,
  profile,
  loadProfile,
  showToast,
}: {
  user: User | null;
  profile: Profile;
  loadProfile: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [studioName, setStudioName] = useState(profile.studio_name || '');
  const [ownerName, setOwnerName] = useState(profile.owner_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || '');
  const [studioLogoUrl, setStudioLogoUrl] = useState(profile.studio_logo_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (phoneNumber && !isValidPhone(phoneNumber)) {
      newErrors.phone_number = 'Please enter a valid phone number (10-15 digits)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await profileService.updateProfile({
        studio_name: studioName,
        owner_name: ownerName,
        phone_number: phoneNumber,
      });
      await loadProfile();
      showToast('Profile saved successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const result = await uploadStudioLogo(file);
      await profileService.updateProfile({ studio_logo_url: result.url });
      setStudioLogoUrl(result.url);
      await loadProfile();
      showToast('Logo uploaded', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      showToast(message, 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    try {
      await profileService.updateProfile({ studio_logo_url: '' });
      setStudioLogoUrl('');
      await loadProfile();
      showToast('Logo removed', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove logo';
      showToast(message, 'error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
          Manage your studio and personal information
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-center gap-4">
            {studioLogoUrl ? (
              <img src={studioLogoUrl} alt="Logo" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                {profile?.studio_name || user?.full_name || 'Your Studio'}
              </h2>
              <p className="text-sm text-text-secondary dark:text-text-secondary">{user?.email}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium text-text-secondary dark:text-text-secondary">Studio Logo</p>
              <div className="flex items-center gap-3">
                {studioLogoUrl ? (
                  <div className="relative">
                    <img src={studioLogoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex items-center gap-2 rounded-lg border border-border-primary dark:border-border-primary px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {studioLogoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted dark:text-text-muted">
                PNG, JPEG or WebP. Shown on share pages, previews, and reports.
              </p>
            </div>

            <div>
              <Input
                label="Studio Name"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Your studio name"
              />
              <p className="mt-1 text-xs text-text-muted dark:text-text-muted">
                Used across share pages and client communications
              </p>
            </div>

            <Input
              label="Owner Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your full name"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              error={errors.phone_number}
            />

            <Input
              label="Email"
              type="email"
              value={user?.email ?? ''}
              readOnly
            />

            <div className="pt-2 flex gap-3">
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
