'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export default function Restock({ id, name, unit }: { id: number; name: string; unit: string }) {
  const router = useRouter();
  async function go() {
    const qty = Number(window.prompt(`Jumlah ${name} yang masuk (${unit})?`));
    if (!Number.isInteger(qty) || qty <= 0) return;
    const price = Number(window.prompt('Total harga beli (Rp)? Isi 0 jika tidak diketahui'));
    if (!Number.isInteger(price) || price < 0) return alert('Harga harus bilangan bulat');
    const { error } = await createClient().rpc('restock_ingredient', { p_id: id, p_qty: qty, p_total_price: price });
    if (error) return alert(error.message);
    router.refresh();
  }
  return <button className="btn sm" onClick={go}>➕ Tambah stok</button>;
}
