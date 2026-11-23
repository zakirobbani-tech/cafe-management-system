import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const OWNER = '11111111-1111-1111-1111-111111111111', CASH = '22222222-2222-2222-2222-222222222222';

test('database: transaksi tanpa pajak, stok atomik, idempotensi, RLS', async () => {
  const db = new PGlite();
  for (const f of ['tests/helpers/supabase_stub.sql', 'database/migrations/001_init.sql', 'database/migrations/002_remove_tax.sql',
    'database/migrations/003_auth_profiles_rls.sql', 'database/migrations/004_sales_functions.sql', 'database/seed/001_demo.sql']) await db.exec(sql(f));
  const q = async (s, p) => (await db.query(s, p)).rows;
  const n = async (s, p) => Number((await q(s, p))[0].v);
  const as = async (uid) => { await db.exec('RESET ROLE'); await db.exec(uid ? `SET test.uid='${uid}'; SET ROLE authenticated` : `SET test.uid=''; SET ROLE anon`); };
  const sale = (key, items) => q('select create_sale($1,$2,$3::bigint,$4::jsonb,$5::jsonb) as r',
    [key, 'dine_in', 0, JSON.stringify(items), JSON.stringify([{ method: 'Tunai', amount: 50000 }])]);
  const kopi = () => n("select stock_qty as v from ingredients where name='Biji Kopi'");

  await db.exec(`INSERT INTO auth.users(id) VALUES ('${OWNER}')`); await db.exec(`INSERT INTO auth.users(id) VALUES ('${CASH}')`);
  assert.equal((await q('select role from profiles where id=$1', [OWNER]))[0].role, 'owner');
  assert.equal((await q('select role from profiles where id=$1', [CASH]))[0].role, 'cashier');
  const m = Object.fromEntries((await q('select name,id from menus')).map((r) => [r.name, Number(r.id)]));
  await db.exec(`INSERT INTO recipes(menu_id,ingredient_id,qty) SELECT ${m.Americano}, i.id, v.q FROM (VALUES ('Biji Kopi',18),('Es Batu',150),('Gelas Plastik',1)) v(n,q) JOIN ingredients i ON i.name=v.n`);
  const items = [{ menu_id: m['Es Kopi Susu'], qty: 1 }, { menu_id: m.Americano, qty: 1 }];

  await as(CASH);
  const r1 = (await sale('key-0001-aaaa', items))[0].r;
  assert.equal(Number(r1.total), 40000); assert.equal(Number(r1.change), 10000); assert.match(r1.number, /^INV-\d{6}-\d{4}$/);
  await db.exec('RESET ROLE');
  const t = (await q('select subtotal,discount,tax,service,total from transactions'))[0];
  assert.deepEqual([t.subtotal, t.discount, t.tax, t.service, t.total].map(Number), [40000, 0, 0, 0, 40000]);
  assert.equal(await kopi(), 4964);
  assert.equal(await n('select sum(cogs) as v from transaction_items'), 12290);
  assert.equal(await n("select count(*) as v from stock_movements where reason='sale'"), 5); // 5 bahan unik (kopi, susu, gula aren, es, gelas)

  await as(CASH);
  assert.equal((await sale('key-0001-aaaa', items))[0].r.duplicate, true);
  await db.exec('RESET ROLE');
  assert.equal(await n('select count(*) as v from transactions'), 1); assert.equal(await kopi(), 4964);

  await db.exec("UPDATE ingredients SET stock_qty=10 WHERE name='Biji Kopi'");
  await as(CASH);
  await assert.rejects(sale('key-0002-bbbb', items), /Stok tidak cukup/);
  await db.exec('RESET ROLE');
  assert.equal(await n('select count(*) as v from transactions'), 1); assert.equal(await kopi(), 10);
  await db.exec("UPDATE ingredients SET stock_qty=4964 WHERE name='Biji Kopi'");

  await as(OWNER); await sale('key-0003-cccc', [{ menu_id: m.Americano, qty: 1 }]);
  await as(CASH);
  assert.equal(await n('select count(*) as v from transactions'), 1);
  await assert.rejects(q('select refund_sale(1,$1)', ['salah input']), /Tidak berwenang/);
  await assert.rejects(db.exec("UPDATE profiles SET role='owner' WHERE id='" + CASH + "'"), /Hanya owner/);
  await assert.rejects(db.exec("INSERT INTO transactions(number,status,order_type,subtotal,total) VALUES ('X','paid','dine_in',1,1)"), /row-level security|permission denied/);
  await as(OWNER);
  assert.equal(await n('select count(*) as v from transactions'), 2);
  const before = await kopi();
  await q('select refund_sale($1,$2)', [Number(r1.id), 'salah input']);
  assert.equal(await kopi(), before + 36);
  assert.equal((await q('select status from transactions where id=$1', [Number(r1.id)]))[0].status, 'refunded');
  await as(null);
  await assert.rejects(db.exec('select * from menus'), /permission denied/);
  await db.exec('RESET ROLE');
  await assert.rejects(db.exec("INSERT INTO transactions(number,status,order_type,subtotal,tax,total) VALUES ('Y','paid','dine_in',100,10,110)"), /transactions_no_tax_chk/);
});
