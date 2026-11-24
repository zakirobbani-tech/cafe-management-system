'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatIDR as fmt } from '@/utils/money.js';

type Menu = { id: number; name: string; category: string; price: number };
const METHODS = ['Tunai', 'QRIS', 'Transfer', 'E-wallet', 'Kartu'];

export default function Pos({ menus }: { menus: Menu[] }) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [disc, setDisc] = useState(0), [method, setMethod] = useState('Tunai'), [type, setType] = useState('dine_in');
  const [cash, setCash] = useState(''), [cat, setCat] = useState('Semua'), [q, setQ] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const [done, setDone] = useState<{ number: string; total: number; paid: number; change: number } | null>(null);
  const key = useRef('');
  const cats = ['Semua', ...Array.from(new Set(menus.map((m) => m.category)))];
  const list = menus.filter((m) => (cat === 'Semua' || m.category === cat) && m.name.toLowerCase().includes(q.toLowerCase()));
  const rows = menus.filter((m) => (cart[m.id] || 0) > 0);
  const sub = rows.reduce((s, m) => s + m.price * cart[m.id], 0);
  const d = Math.min(disc, sub), total = sub - d;
  const add = (id: number, n: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + n) }));

  async function pay() {
    if (!rows.length) return setErr('Keranjang kosong');
    if (total <= 0) return setErr('Total harus lebih dari Rp0');
    const paid = method === 'Tunai' ? Number(cash || 0) : total;
    if (paid < total) return setErr('Uang diterima kurang ' + fmt(total - paid));
    setBusy(true); setErr('');
    if (!key.current) key.current = crypto.randomUUID(); // tetap sama saat retry → tidak ada transaksi ganda
    const { data, error } = await createClient().rpc('create_sale', {
      p_key: key.current, p_type: type, p_discount: d,
      p_items: rows.map((m) => ({ menu_id: m.id, qty: cart[m.id] })),
      p_payments: [{ method, amount: total }],
    });
    setBusy(false);
    if (error) return setErr(error.message);
    key.current = '';
    setDone({ number: data.number, total: data.total, paid, change: paid - total });
    setCart({}); setDisc(0); setCash('');
  }

  return (<>
    <h1>Kasir</h1>
    {!menus.length && <div className="card">Belum ada menu. Jalankan seed menu (lihat docs/SUPABASE_SETUP.md).</div>}
    <div className="two">
      <div>
        <input placeholder="Cari menu…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pills" style={{ marginTop: 8 }}>{cats.map((c) => <button key={c} className={'pill' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="menu">{list.map((m) => (
          <button key={m.id} className="mi" onClick={() => add(m.id, 1)}><b>{m.name}</b><div className="k">{m.category}</div><div>{fmt(m.price)}</div></button>))}</div>
      </div>
      <div className="card" style={{ alignSelf: 'start' }}>
        <h2>Keranjang</h2>
        {rows.map((m) => (
          <div className="row" key={m.id}><span>{m.name}<div className="k">{fmt(m.price)}</div></span>
            <span className="qty"><button onClick={() => add(m.id, -1)}>−</button><b>{cart[m.id]}</b><button onClick={() => add(m.id, 1)}>+</button></span></div>))}
        {!rows.length && <div className="k">Belum ada item</div>}
        <div className="row"><span className="k">Subtotal</span><span>{fmt(sub)}</span></div>
        <div className="row"><span className="k">Diskon (Rp)</span>
          <input style={{ width: 130 }} inputMode="numeric" placeholder="0" value={disc || ''} onChange={(e) => setDisc(Number(e.target.value.replace(/\D/g, '')) || 0)} /></div>
        <div className="row"><b>Total</b><b>{fmt(total)}</b></div>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="dine_in">Dine In</option><option value="take_away">Take Away</option><option value="delivery">Delivery</option></select>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          {method === 'Tunai' && <input inputMode="numeric" placeholder="Uang diterima (Rp)" value={cash} onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))} />}
          {err && <div className="err">{err}</div>}
          <button className="btn" disabled={busy} onClick={pay}>{busy ? 'Menyimpan…' : 'Bayar ' + fmt(total)}</button>
        </div>
      </div>
    </div>
    {done && (
      <div className="ov"><div className="rc">
        <div style={{ textAlign: 'center' }}><b>PLACE #1</b><br />YOUNG.WILD.FREE<br />{done.number}</div><hr />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Total</b><b>{fmt(done.total)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Diterima</span><span>{fmt(done.paid)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kembali</span><span>{fmt(done.change)}</span></div>
        <p style={{ textAlign: 'center' }}>Transaksi tersimpan di database.</p>
        <button className="btn" style={{ width: '100%' }} onClick={() => setDone(null)}>Selesai</button>
      </div></div>)}
  </>);
}
