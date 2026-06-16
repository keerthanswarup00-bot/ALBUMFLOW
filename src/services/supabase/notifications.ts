import { supabase } from './client';
import { ApiError } from '@/utils/errors';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  album_id: string | null;
  studio_name: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new ApiError(`Failed to fetch notifications: ${error.message}`, 500, error);
  return data ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) throw new ApiError(`Failed to count notifications: ${error.message}`, 500, error);
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw new ApiError(`Failed to mark notification as read: ${error.message}`, 500, error);
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) throw new ApiError(`Failed to mark all as read: ${error.message}`, 500, error);
}
