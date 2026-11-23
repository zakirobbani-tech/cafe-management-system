import { rupiah, bpOf } from '../utils/money.js';
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);

/** items: [{price, qty, discount}]; rate dalam basis points. Service dihitung sebelum pajak. */
export function computeOrder({ items, orderDiscount = 0, serviceBp = 0, taxBp = 0 }) {
  const subtotal = sum(items, (i) => rupiah(i.price) * i.qty);
  const itemDiscount = sum(items, (i) => rupiah(i.discount || 0));
  const base = subtotal - itemDiscount - rupiah(orderDiscount);
  if (base < 0) throw new RangeError('Diskon melebihi subtotal');
  const service = bpOf(base, serviceBp);
  const tax = bpOf(base + service, taxBp);
  return { subtotal, discount: itemDiscount + orderDiscount, service, tax, total: base + service + tax };
}
export function changeDue(total, payments) {
  const paid = sum(payments, (p) => rupiah(p.amount));
  if (paid < total) throw new RangeError('Pembayaran kurang');
  return paid - total;
}
/** Hanya paid/refunded dihitung; pending & cancelled dikeluarkan. */
export function netSales(txs) {
  return sum(txs.filter((t) => t.status === 'paid' || t.status === 'refunded'),
    (t) => t.subtotal - (t.discount || 0) - (t.refundAmount || 0));
}
/** HPP satu porsi. recipe: [{qty, avgCostMilli}] */
export const recipeCost = (recipe) => Math.round(sum(recipe, (r) => r.qty * r.avgCostMilli) / 1000);
/** Moving weighted average (milli-rupiah per satuan dasar). */
export function movingAverage({ oldQty, oldCostMilli, inQty, inTotalPrice }) {
  const inCostMilli = Math.round((inTotalPrice * 1000) / inQty);
  return Math.round((oldQty * oldCostMilli + inQty * inCostMilli) / (oldQty + inQty));
}
export const grossProfit = (net, cogs) => net - cogs;
/** Biaya operasional TIDAK termasuk pembelian stok (itu persediaan; yang dibebankan = HPP). */
export const operatingProfit = (gross, opex) => gross - opex;
export function stockAfterSale(stock, recipe, qty) {
  return recipe.map((r) => ({ id: r.ingredientId, after: stock[r.ingredientId] - r.qty * qty }));
}
export function cashReconciliation({ opening, cashSales, cashRefunds = 0, cashExpenses = 0, counted }) {
  const expected = opening + cashSales - cashRefunds - cashExpenses;
  return { expected, variance: counted - expected };
}
