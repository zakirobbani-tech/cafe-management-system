'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export default function RefundButton({ id, number }: { id: number; number: string }) {
  const router = useRouter();
  async function go() {
    const reason = window.prompt(`Alasan refund ${number}? (stok bahan akan dikembalikan)`);
    if (!reason) return;
    const { error } = await createClient().rpc('refund_sale', { p_tx: id, p_reason: reason });
    if (error) return alert(error.message);
    router.refresh();
  }
  return <button className="btn sec sm" onClick={go}>Refund</button>;
}
