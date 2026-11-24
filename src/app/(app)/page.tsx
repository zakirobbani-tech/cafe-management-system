import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { dayKey, startOfDay, fmtDateTime } from '@/utils/date';
import { formatIDR as fmt } from '@/utils/money.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Dashboard() {
  const supabase = await createClient();
  const p = await getProfile();
  const [{ data: txs }, { data: ing }] = await Promise.all([
    supabase.from('transactions').select('id,number,status,subtotal,discount,total,created_at,transaction_items(name,qty,cogs)')
      .gte('created_at', startOfDay(6)).order('created_at', { ascending: false }),
    supabase.from('ingredients').select('name,unit,stock_qty,min_qty').order('name'),
  ]);
  const all: any[] = txs ?? [];
  const net = (t: any) => (t.status === 'paid' ? t.subtotal - t.discount : 0);
  const today = dayKey(new Date());
  const td = all.filter((t) => dayKey(t.created_at) === today);
  const paid = td.filter((t) => t.status === 'paid');
  const omzet = paid.reduce((s, t) => s + net(t), 0);
  const hpp = paid.reduce((s, t) => s + t.transaction_items.reduce((a: number, i: any) => a + i.cogs, 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - (6 - i) * 864e5)));
  const vals = days.map((d) => all.filter((t) => dayKey(t.created_at) === d).reduce((s, t) => s + net(t), 0));
  const mx = Math.max(...vals, 1);
  const low = (ing ?? []).filter((i: any) => i.stock_qty <= i.min_qty);
  const c = (k: string, v: string | number) => <div className="card"><div className="k">{k}</div><div className="v">{v}</div></div>;
  return (<>
    <div className="hero">
      <div><div className="hk">{new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="hn">PLACE #1</div><div className="hk">YOUNG.WILD.FREE</div></div>
      <div className="hp"><b>{paid.length}</b><span>transaksi hari ini</span></div>
    </div>
    {p?.role === 'cashier' && <p className="k" style={{ color: 'var(--h2)' }}>Menampilkan transaksi Anda sendiri.</p>}
    <div className="grid">{c('Omzet hari ini', fmt(omzet))}{c('Transaksi', paid.length)}{c('Rata-rata', fmt(paid.length ? Math.round(omzet / paid.length) : 0))}{c('HPP', fmt(hpp))}{c('Laba kotor', fmt(omzet - hpp))}</div>
    <div className="two" style={{ marginTop: 12 }}>
      <div className="card"><h2>Omzet 7 hari terakhir</h2>
        <div className="chart">{vals.map((v, i) => (
          <div key={days[i]} className={'bar' + (i === 6 ? ' t' : '')} title={`${days[i]}: ${fmt(v)}`}><i style={{ height: `${Math.round((v / mx) * 100)}%` }} />{days[i].slice(8)}</div>))}</div></div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div className="card"><h2>Transaksi terbaru</h2>
          {all.slice(0, 5).map((t) => <div className="row" key={t.id}><span>{t.number}<div className="k">{fmtDateTime(t.created_at)}</div></span><b>{fmt(t.total)}</b></div>)}
          {!all.length && <div className="k">Belum ada transaksi</div>}</div>
        <div className="card"><h2>Perlu restock</h2>
          {low.map((i: any) => <div className="row" key={i.name}><span>{i.name}</span><span className={'chip ' + (i.stock_qty <= 0 ? 'bad' : 'warn')}>{i.stock_qty <= 0 ? 'Habis' : 'Menipis'}</span></div>)}
          {!low.length && <div className="k">Semua aman</div>}</div>
      </div>
    </div>
    <p className="k">Laba adalah estimasi operasional, bukan laporan laba rugi akuntansi atau perhitungan pajak final.</p>
  </>);
}
