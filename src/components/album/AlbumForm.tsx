import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { AlbumFormData, EventType, Album } from '@/types';
import { EVENT_TYPES } from '@/types';

interface AlbumFormProps {
  initialData?: Partial<Album>;
  onSubmit: (data: AlbumFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

function validate(data: AlbumFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.title.trim()) errors.title = 'Album name is required';
  return errors;
}

export function AlbumForm({ initialData, onSubmit, onCancel, isSaving }: AlbumFormProps) {
  const [formData, setFormData] = useState<AlbumFormData>({
    title: initialData?.title ?? '',
    client_name: initialData?.client_name ?? '',
    client_email: initialData?.client_email ?? '',
    event_type: (initialData?.event_type as EventType) ?? 'wedding',
    description: initialData?.description ?? '',
    deadline: initialData?.deadline ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleField<K extends keyof AlbumFormData>(field: K, value: AlbumFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label="Album Name"
        value={formData.title}
        onChange={(e) => handleField('title', e.target.value)}
        error={errors.title}
        placeholder="e.g. Smith & Johnson Wedding"
        required
      />

      <Input
        label="Client Name (optional)"
        value={formData.client_name}
        onChange={(e) => handleField('client_name', e.target.value)}
        error={errors.client_name}
        placeholder="e.g. Sarah & Michael"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Event Type</label>
        <select
          value={formData.event_type}
          onChange={(e) => handleField('event_type', e.target.value as EventType)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Client Email (optional)"
        type="email"
        value={formData.client_email}
        onChange={(e) => handleField('client_email', e.target.value)}
        placeholder="client@example.com"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Description (optional)</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleField('description', e.target.value)}
          rows={3}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Add any notes about this album..."
        />
      </div>

      <Input
        label="Deadline (optional)"
        type="date"
        value={formData.deadline}
        onChange={(e) => handleField('deadline', e.target.value)}
      />

      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {initialData ? 'Save Changes' : 'Create Album'}
        </Button>
      </div>
    </form>
  );
}
