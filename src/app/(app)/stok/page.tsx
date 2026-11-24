import Restock from '@/components/Restock';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Stok() {
  const supabase = await createClient();
  const p = await getProfile();
  const { data } = await supabase.from('ingredients').select('id,name,unit,stock_qty,min_qty,avg_cost_milli').order('name');
  const can = p?.role === 'owner' || p?.role === 'manager';
  return (<>
    <h1>Stok bahan</h1>
    <div className="card">
      {(data ?? []).map((i: any) => {
        const [l, c] = i.stock_qty <= 0 ? ['Habis', 'bad'] : i.stock_qty <= i.min_qty ? ['Menipis', 'warn'] : ['Aman', 'ok'];
        return (<div className="row" key={i.id} style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{i.name}</b><span className={'chip ' + c}>{l}</span></div>
          <div className="k">{Math.max(0, i.stock_qty).toLocaleString('id-ID')} {i.unit} · min {i.min_qty.toLocaleString('id-ID')} · Rp{(i.avg_cost_milli / 1000).toLocaleString('id-ID')}/{i.unit}</div>
          <div className="meter"><i style={{ width: `${Math.min(100, Math.max(0, (i.stock_qty / ((i.min_qty * 4) || 1)) * 100))}%` }} /></div>
          {can && <div style={{ marginTop: 8 }}><Restock id={i.id} name={i.name} unit={i.unit} /></div>}
        </div>);
      })}
      {!data?.length && <div className="k">Belum ada bahan. Jalankan seed menu atau tambahkan bahan lewat SQL Editor.</div>}
    </div>
    <p className="k">Setiap perubahan stok tercatat di riwayat stok (stock_movements). Harga beli memperbarui biaya rata-rata (HPP).</p>
  </>);
}
