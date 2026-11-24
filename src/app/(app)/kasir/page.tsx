import Pos from '@/components/Pos';
import { createClient } from '@/lib/supabase/server';
export default async function Kasir() {
  const supabase = await createClient();
  const { data } = await supabase.from('menus').select('id,name,category,price').eq('available', true).order('category').order('name');
  return <Pos menus={data ?? []} />;
}
