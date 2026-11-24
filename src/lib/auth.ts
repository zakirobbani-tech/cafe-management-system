import { createClient } from '@/lib/supabase/server';
export type Role = 'owner' | 'manager' | 'cashier';
export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('full_name, role, active').eq('id', user.id).single();
  return data ? { full_name: data.full_name as string, role: data.role as Role, active: data.active as boolean, email: user.email ?? '' } : null;
}
