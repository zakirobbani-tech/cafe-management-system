import test from 'node:test';
import assert from 'node:assert/strict';
import * as f from '../src/services/finance.js';
import { formatIDR } from '../src/utils/money.js';

test('format Rupiah', () => { assert.equal(formatIDR(22000), 'Rp22.000'); assert.equal(formatIDR(1500000), 'Rp1.500.000'); });
test('uang non-integer ditolak', () => assert.throws(() => formatIDR(10.5)));
test('tanpa pajak: Rp22.000 + Rp18.000 = Rp40.000', () => {
  const o = f.computeOrder({ items: [{ price: 22000, qty: 1 }, { price: 18000, qty: 1 }] });
  assert.deepEqual(o, { subtotal: 40000, discount: 0, total: 40000 });
  assert.equal('tax' in o || 'service' in o, false);
});
test('diskon mengurangi total; diskon berlebih ditolak', () => {
  assert.equal(f.computeOrder({ items: [{ price: 40000, qty: 1 }], orderDiscount: 5000 }).total, 35000);
  assert.throws(() => f.computeOrder({ items: [{ price: 1000, qty: 1 }], orderDiscount: 2000 }));
});
test('kembalian, pembayaran kurang, split', () => {
  assert.equal(f.changeDue(40000, [{ amount: 50000 }]), 10000);
  assert.throws(() => f.changeDue(40000, [{ amount: 30000 }]));
  assert.equal(f.changeDue(40000, [{ amount: 25000 }, { amount: 20000 }]), 5000);
});
test('omzet bersih: pending/cancelled out, refund mengurangi', () => {
  const txs = [
    { status: 'paid', subtotal: 50000, discount: 5000 },
    { status: 'refunded', subtotal: 30000, refundAmount: 30000 },
    { status: 'pending', subtotal: 20000 }, { status: 'cancelled', subtotal: 99000 },
    { status: 'paid', subtotal: 40000, refundAmount: 10000 },
  ];
  assert.equal(f.netSales(txs), 75000);
});
test('HPP Es Kopi Susu = Rp7.600, laba kotor per menu', () => {
  const hpp = f.recipeCost([{ qty: 18, avgCostMilli: 180000 }, { qty: 120, avgCostMilli: 18000 },
    { qty: 25, avgCostMilli: 30000 }, { qty: 150, avgCostMilli: 5000 }, { qty: 1, avgCostMilli: 700000 }]);
  assert.equal(hpp, 7600);
  assert.equal(f.grossProfit(22000, hpp), 14400);
});
test('moving average setelah pembelian', () => {
  assert.equal(f.movingAverage({ oldQty: 1000, oldCostMilli: 150000, inQty: 1000, inTotalPrice: 200000 }), 175000);
});
test('laba operasional', () => {
  assert.equal(f.operatingProfit(f.grossProfit(1000000, 350000), 200000), 450000);
});
test('stok berkurang sesuai resep', () => {
  const r = f.stockAfterSale({ 1: 5000, 2: 10000 }, [{ ingredientId: 1, qty: 18 }, { ingredientId: 2, qty: 120 }], 2);
  assert.deepEqual(r, [{ id: 1, after: 4964 }, { id: 2, after: 9760 }]);
});
test('rekonsiliasi kas shift', () => {
  assert.deepEqual(f.cashReconciliation({ opening: 200000, cashSales: 500000, cashRefunds: 20000, cashExpenses: 30000, counted: 645000 }),
    { expected: 650000, variance: -5000 });
});
