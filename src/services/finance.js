import { rupiah } from '../utils/money.js';
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);

/** items: [{price, qty, discount}]. Tanpa pajak dan tanpa service charge. */
export function computeOrder({ items, orderDiscount = 0 }) {
  const subtotal = sum(items, (i) => rupiah(i.price) * i.qty);
  const discount = sum(items, (i) => rupiah(i.discount || 0)) + rupiah(orderDiscount);
  if (discount > subtotal) throw new RangeError('Diskon melebihi subtotal');
  return { subtotal, discount, total: subtotal - discount };
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
