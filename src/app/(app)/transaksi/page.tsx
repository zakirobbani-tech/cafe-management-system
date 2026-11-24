import RefundButton from '@/components/RefundButton';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { fmtDateTime } from '@/utils/date';
import { formatIDR as fmt } from '@/utils/money.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Transaksi() {
  const supabase = await createClient();
  const p = await getProfile();
  const { data } = await supabase.from('transactions')
    .select('id,number,status,order_type,total,discount,created_at,cancel_reason,transaction_items(name,qty,price),payments(method)')
    .order('created_at', { ascending: false }).limit(50);
  const canRefund = p?.role === 'owner' || p?.role === 'manager';
  return (<>
    <h1>Transaksi</h1>
    <div className="card">
      {(data ?? []).map((t: any) => (
        <div className="row" key={t.id} style={{ alignItems: 'flex-start' }}>
          <span><b>{t.number}</b>
            <div>{t.transaction_items.map((i: any) => `${i.qty}× ${i.name}`).join(', ')}</div>
            <div className="k">{fmtDateTime(t.created_at)} · {t.order_type} · {t.payments.map((x: any) => x.method).join('+')}{t.discount ? ` · diskon ${fmt(t.discount)}` : ''}</div>
            {t.cancel_reason && <div className="k">Alasan refund: {t.cancel_reason}</div>}</span>
          <span style={{ textAlign: 'right' }}><b>{fmt(t.total)}</b>
            <div><span className={'chip ' + (t.status === 'paid' ? 'ok' : 'bad')}>{t.status === 'paid' ? 'Paid' : t.status}</span>{' '}
              {canRefund && t.status === 'paid' && <RefundButton id={t.id} number={t.number} />}</div></span>
        </div>))}
      {!data?.length && <div className="k">Belum ada transaksi</div>}
    </div>
  </>);
}
